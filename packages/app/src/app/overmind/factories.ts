import { Contributor, PermissionType } from '@codesandbox/common/lib/types';
import { hasPermission } from '@codesandbox/common/lib/utils/permission';
import { identify } from '@codesandbox/common/lib/utils/analytics';
import { IState, derived } from 'overmind';

import { notificationState } from '@codesandbox/common/lib/utils/notifications';
import { NotificationStatus } from '@codesandbox/notifications';
import { AsyncAction, RootState } from '.';

/*
  Ensures that we have loaded the app with the initial user
  and settings
*/
export const withLoadApp = <T>(
  continueAction?: AsyncAction<T>
): AsyncAction<T> => async (context, value) => {
  const { effects, state, actions } = context;

  if (state.hasLoadedApp && continueAction) {
    await continueAction(context, value);
    return;
  }
  if (state.hasLoadedApp) {
    return;
  }

  state.isAuthenticating = true;

  effects.connection.addListener(actions.connectionChanged);
  actions.internal.setStoredSettings();
  effects.codesandboxApi.listen(actions.server.onCodeSandboxAPIMessage);

  if (localStorage.jwt) {
    // We've introduced a new way of signing in to CodeSandbox, and we should let the user know to
    // convert to it.

    document.cookie =
      'signedIn=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    state.hasLogIn = false;

    try {
      const jwt = JSON.parse(localStorage.jwt);
      effects.api.revokeToken(jwt);
    } catch (e) {
      // Ignore
    }

    delete localStorage.jwt;
    notificationState.addNotification({
      sticky: true,
      message:
        'Sorry, we had to sign you out. Please sign in again to continue.',
      status: NotificationStatus.NOTICE,
      actions: {
        primary: {
          label: 'Sign in',
          run: () => {
            actions.signInClicked();
          },
        },
      },
    });
  }

  if (state.hasLogIn) {
    try {
      await Promise.all([
        effects.api.getCurrentUser().then(user => {
          state.user = user;
        }),
      ]);

      actions.dashboard.getTeams();
      actions.internal.setPatronPrice();
      effects.analytics.identify('signed_in', true);
      effects.analytics.setUserId(state.user!.id, state.user!.email);

      try {
        actions.internal.trackCurrentTeams().catch(e => {});
        actions.internal.identifyCurrentUser().catch(e => {});
      } catch (e) {
        // Not majorly important
      }
      actions.internal.showUserSurveyIfNeeded();
      await effects.live.getSocket();
      actions.userNotifications.internal.initialize();
      effects.api.preloadTemplates();
      state.hasLogIn = true;
    } catch (error) {
      actions.internal.handleError({
        message: 'We had trouble with signing you in',
        error,
      });
    }
  } else {
    identify('signed_in', false);
    effects.analytics.setAnonymousId();
  }

  if (continueAction) {
    await continueAction(context, value);
  }

  state.hasLoadedApp = true;
  state.isAuthenticating = false;

  try {
    const response = await effects.http.get<{
      contributors: Contributor[];
    }>(
      'https://raw.githubusercontent.com/codesandbox/codesandbox-client/master/.all-contributorsrc'
    );

    state.contributors = response.data.contributors.map(
      contributor => contributor.login
    );
  } catch (error) {
    // Something wrong in the parsing probably, make sure the file is JSON valid
  }
};

export const withOwnedSandbox = <T>(
  continueAction: AsyncAction<T>,
  cancelAction: AsyncAction<T> = () => Promise.resolve(),
  requiredPermission?: PermissionType
): AsyncAction<T> => async (context, payload) => {
  const { state, actions } = context;

  const sandbox = state.editor.currentSandbox;
  if (sandbox) {
    if (
      typeof requiredPermission === 'undefined'
        ? !sandbox.owned
        : !hasPermission(sandbox.authorization, requiredPermission)
    ) {
      if (state.editor.isForkingSandbox) {
        return cancelAction(context, payload);
      }

      try {
        await actions.editor.internal.forkSandbox({
          sandboxId: sandbox.id,
        });
      } catch (e) {
        return cancelAction(context, payload);
      }
    } else if (sandbox.isFrozen && state.editor.sessionFrozen) {
      const modalResponse = await actions.modals.forkFrozenModal.open();

      if (modalResponse === 'fork') {
        try {
          await actions.editor.internal.forkSandbox({
            sandboxId: sandbox.id,
          });
        } catch (e) {
          return cancelAction(context, payload);
        }
      } else if (modalResponse === 'unfreeze') {
        state.editor.sessionFrozen = false;
      } else if (modalResponse === 'cancel') {
        return cancelAction(context, payload);
      }
    }
  }

  return continueAction(context, payload);
};

export const createModals = <
  T extends {
    [name: string]: {
      state?: IState;
      result?: unknown;
    };
  }
>(
  modals: T
): {
  state: {
    current: keyof T | null;
  } & {
    [K in keyof T]: T[K]['state'] & { isCurrent: boolean };
  };
  actions: {
    [K in keyof T]: {
      open: AsyncAction<
        T[K]['state'] extends IState ? T[K]['state'] : void,
        T[K]['result']
      >;
      close: AsyncAction<T[K]['result']>;
    };
  };
} => {
  function createModal(name, modal) {
    let resolver: ((res: T) => void) | null;

    const open: AsyncAction<any, any> = async ({ state }, newState = {}) => {
      state.modals.current = name;

      Object.assign(state.modals[name], newState);

      return new Promise(resolve => {
        resolver = resolve;
      });
    };

    const close: AsyncAction<T> = async ({ state }, payload) => {
      state.modals.current = null;
      if (resolver) {
        resolver(payload || modal.result);
      }
    };

    return {
      state: {
        ...modal.state,
        isCurrent: derived(
          (_, root: RootState) => root.modals.current === name
        ),
      },
      actions: {
        open,
        close,
      },
    };
  }

  return Object.keys(modals).reduce(
    (aggr, name) => {
      const modal = createModal(name, modals[name]);

      aggr.state[name] = modal.state;
      aggr.actions[name] = modal.actions;

      return aggr;
    },
    {
      state: {
        current: null,
      },
      actions: {},
    }
  ) as any;
};

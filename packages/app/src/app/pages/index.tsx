import { DNT, trackPageview } from '@codesandbox/common/lib/utils/analytics';
import _debug from '@codesandbox/common/lib/utils/debug';
import { notificationState } from '@codesandbox/common/lib/utils/notifications';
import { Toasts } from '@codesandbox/notifications';
import { useOvermind } from 'app/overmind';
import Loadable from 'app/utils/Loadable';
import React, { useEffect } from 'react';
import { SignInModal } from 'app/components/SignInModal';
import { Redirect, Route, Switch, withRouter } from 'react-router-dom';
import { CreateSandboxModal } from 'app/components/CreateNewSandbox/CreateSandbox/CreateSandboxModal';

import { ErrorBoundary } from './common/ErrorBoundary';
import { Modals } from './common/Modals';
import { DevAuthPage } from './DevAuth';
import { Container, Content } from './elements';
import { Dashboard } from './Dashboard';
import { Sandbox } from './Sandbox';

const MoveSandboxFolderModal = Loadable(() =>
  import(
    /* webpackChunkName: 'move-sandbox-modal' */ './common/Modals/MoveSandboxFolderModal'
  ).then(module => ({
    default: module.MoveSandboxFolderModal,
  }))
);

const routeDebugger = _debug('cs:app:router');

const SignInAuth = Loadable(() =>
  import(/* webpackChunkName: 'page-sign-in' */ './SignInAuth')
);
const SignIn = Loadable(() =>
  import(/* webpackChunkName: 'page-sign-in' */ './SignIn')
);
const Live = Loadable(() =>
  import(/* webpackChunkName: 'page-sign-in' */ './Live').then(module => ({
    default: module.LivePage,
  }))
);
const VercelSignIn = Loadable(() =>
  import(/* webpackChunkName: 'page-vercel' */ './VercelAuth')
);
const PreviewAuth = Loadable(() =>
  import(/* webpackChunkName: 'page-vercel' */ './PreviewAuth')
);
const NotFound = Loadable(() =>
  import(/* webpackChunkName: 'page-not-found' */ './common/NotFound').then(
    module => ({
      default: module.NotFound,
    })
  )
);
const Profile = Loadable(() =>
  import(/* webpackChunkName: 'page-profile' */ './Profile').then(module => ({
    default: module.Profile,
  }))
);
const Search = Loadable(() =>
  import(/* webpackChunkName: 'page-search' */ './Search').then(module => ({
    default: module.Search,
  }))
);
const CLI = Loadable(() =>
  import(/* webpackChunkName: 'page-cli' */ './CLI').then(module => ({
    default: module.CLI,
  }))
);

const TeamInvitation = Loadable(() =>
  import(
    /* webpackChunkName: 'page-team-invitation' */ './TeamInvitation'
  ).then(module => ({
    default: module.TeamInvitation,
  }))
);

const GitHub = Loadable(() =>
  import(/* webpackChunkName: 'page-github' */ './GitHub').then(module => ({
    default: module.GitHub,
  }))
);
const CliInstructions = Loadable(() =>
  import(
    /* webpackChunkName: 'page-cli-instructions' */ './CliInstructions'
  ).then(module => ({ default: module.CLIInstructions }))
);
const Patron = Loadable(() =>
  import(/* webpackChunkName: 'page-patron' */ './Patron')
);
const SignUp = Loadable(() =>
  import(/* webpackChunkName: 'page-signup' */ './SignUp').then(module => ({
    default: module.SignUp,
  }))
);
const Pro = Loadable(() => import(/* webpackChunkName: 'page-pro' */ './Pro'));
const Curator = Loadable(() =>
  import(/* webpackChunkName: 'page-curator' */ './Curator').then(module => ({
    default: module.Curator,
  }))
);
const CodeSadbox = () => this[`💥`].kaboom();

const Boundary = withRouter(ErrorBoundary);

const RoutesComponent: React.FC = () => {
  const {
    actions: { appUnmounted },
    state: { signInModalOpen, user, modals },
  } = useOvermind();
  useEffect(() => () => appUnmounted(), [appUnmounted]);

  return (
    <Container>
      <Route
        path="/"
        render={({ location, history }) => {
          if (
            process.env.NODE_ENV === 'production' &&
            history.action !== 'REPLACE'
          ) {
            routeDebugger(
              `Sending '${location.pathname + location.search}' to analytics.`
            );
            if (!DNT) {
              trackPageview();
            }
          }
          return null;
        }}
      />
      <Toasts state={notificationState} />
      <Boundary>
        <Content>
          <Switch>
            <Route exact path="/" render={() => <Redirect to="/s" />} />
            <Route exact path="/s/github" component={GitHub} />
            <Route exact path="/s/cli" component={CliInstructions} />
            <Route
              exact
              path="/s"
              component={() => <Sandbox showNewSandboxModal />}
            />
            <Route
              exact
              path="/s2"
              component={() => <Sandbox showNewSandboxModal />}
            />
            <Route path="/invite/:token" component={TeamInvitation} />

            <Route path="/dashboard" component={Dashboard} />
            <Route path="/new-dashboard" component={Dashboard} />
            <Route path="/curator" component={Curator} />
            <Route path="/s/:id*" component={Sandbox} />
            <Route path="/live/:id" component={Live} />
            <Route path="/signin" exact component={SignIn} />
            <Route path="/signup/:userId" exact component={SignUp} />
            <Route path="/signin/:jwt?" component={SignInAuth} />
            <Route path="/u/:username" component={Profile} />
            <Route path="/search" component={Search} />
            <Route path="/patron" component={Patron} />
            <Route path="/pro" component={Pro} />
            <Route path="/cli/login" component={CLI} />
            <Route path="/auth/zeit" component={VercelSignIn} />
            <Route path="/auth/sandbox/:id" component={PreviewAuth} />
            {(process.env.LOCAL_SERVER || process.env.STAGING) && (
              <Route path="/auth/dev" component={DevAuthPage} />
            )}
            <Route path="/codesadbox" component={CodeSadbox} />
            <Route component={NotFound} />
          </Switch>
        </Content>
        <Modals />
        {signInModalOpen && !user ? <SignInModal /> : null}
        <CreateSandboxModal />
        {modals.moveSandboxModal.isCurrent && <MoveSandboxFolderModal />}
      </Boundary>
    </Container>
  );
};

export const Routes = withRouter(RoutesComponent);

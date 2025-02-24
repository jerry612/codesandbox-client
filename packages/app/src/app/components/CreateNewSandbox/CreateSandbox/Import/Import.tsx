import track from '@codesandbox/common/lib/utils/analytics';
import {
  gitHubRepoPattern,
  gitHubToSandboxUrl,
  protocolAndHost,
} from '@codesandbox/common/lib/utils/url-generator';
import { Button } from '@codesandbox/components';
import { useOvermind } from 'app/overmind';
import { SignInButton } from 'app/pages/common/SignInButton';
import React, { useCallback, useEffect, useState } from 'react';

import { Header } from '../elements';
import { GitHubIcon, StackbitIcon } from '../Icons';
import { DownloadIcon } from '../Icons/DownloadIcon';
import { TerminalIcon } from '../Icons/TerminalIcon';
import {
  ButtonContainer,
  Column,
  FeatureName,
  FeatureText,
  Features,
  GitHubLink,
  IconLink,
  ImportChoices,
  Input,
  PlaceHolderLink,
  StyledInfoIcon,
  VerticalSeparator,
} from './elements';
import { StackbitButton } from './Stackbit';

const getFullGitHubUrl = (url: string) =>
  `${protocolAndHost()}${gitHubToSandboxUrl(url)}`;

export const Import = () => {
  const { state, actions, effects } = useOvermind();
  const [error, setError] = useState(null);
  const [transformedUrl, setTransformedUrl] = useState('');
  const [url, setUrl] = useState('');

  useEffect(() => {
    track('Create Sandbox Tab Open', { tab: 'import' });
  }, []);

  const updateUrl = useCallback(({ target: { value: newUrl } }) => {
    if (!newUrl) {
      setError(null);
      setTransformedUrl('');
      setUrl(newUrl);
    } else if (!gitHubRepoPattern.test(newUrl)) {
      setError('The URL provided is not valid.');
      setTransformedUrl('');
      setUrl(newUrl);
    } else {
      setError(null);
      setTransformedUrl(getFullGitHubUrl(newUrl.trim()));
      setUrl(newUrl);
    }
  }, []);

  return (
    <>
      <Header>
        <span>Import Project</span>
      </Header>
      <Features>
        <Column>
          <FeatureName>
            <GitHubIcon style={{ marginRight: '1rem' }} />
            Import from GitHub{' '}
            <IconLink href="/docs/importing#import-from-github">
              <StyledInfoIcon />
            </IconLink>
          </FeatureName>
          <FeatureText>
            Enter the URL to your GitHub repository to generate a URL to your
            sandbox. The sandbox will stay in sync with your repository.
            <small>
              Tip: you can also link to specific directories, commits and
              branches here.
            </small>
          </FeatureText>
          <form>
            <Input
              value={url}
              onChange={updateUrl}
              type="text"
              placeholder="GitHub Repository URL..."
            />

            {transformedUrl ? (
              <GitHubLink
                href={transformedUrl}
                target="_blank"
                rel="noreferrer noopener"
              >
                {transformedUrl.replace(/^https?:\/\//, '')}
              </GitHubLink>
            ) : (
              <PlaceHolderLink error={error}>
                {error || 'Enter a URL to see the generated URL'}
              </PlaceHolderLink>
            )}

            <ButtonContainer>
              <Button
                autoWidth
                style={{ fontSize: 11 }}
                onClick={() => effects.browser.copyToClipboard(transformedUrl)}
                disabled={!transformedUrl}
              >
                Copy Link
              </Button>
              <Button
                autoWidth
                style={{ fontSize: 11 }}
                disabled={!transformedUrl}
                onClick={async () => {
                  await actions.git.importFromGithub(gitHubToSandboxUrl(url));
                  actions.modals.newSandboxModal.close();
                }}
              >
                Import and Fork
              </Button>
            </ButtonContainer>
          </form>
        </Column>

        <>
          <VerticalSeparator />
          <Column>
            <FeatureName>
              <StackbitIcon style={{ marginRight: '1rem' }} />
              Import from Stackbit
            </FeatureName>
            <FeatureText>
              Create a project using{' '}
              <a
                href="https://www.stackbit.com/"
                target="_blank"
                rel="noreferrer noopener"
              >
                Stackbit
              </a>
              . This generates a project for you that{"'"}s automatically set up
              with any Theme, Site Generator and CMS.
            </FeatureText>
            {!state.user ? (
              <SignInButton />
            ) : (
              <StackbitButton
                style={{ fontSize: 11 }}
                username={state.user.username}
                closeModal={() => actions.modalClosed()}
              />
            )}
          </Column>
        </>
      </Features>
      <ImportChoices>
        <a href="/docs/importing#export-with-cli">
          <TerminalIcon />
          CLI Documentation
        </a>
        <a href="/docs/importing#define-api">
          <DownloadIcon />
          API Documentation
        </a>
      </ImportChoices>
    </>
  );
};

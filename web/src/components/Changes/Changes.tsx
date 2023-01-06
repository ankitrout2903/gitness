import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Container, FlexExpander, ButtonVariation, Layout, Text, StringSubstitute, Button } from '@harness/uicore'
import * as Diff2Html from 'diff2html'
import cx from 'classnames'
import { useGet } from 'restful-react'
import { useStrings } from 'framework/strings'
import type { GitInfoProps } from 'utils/GitUtils'
import { formatNumber } from 'utils/Utils'
import { DiffViewer } from 'components/DiffViewer/DiffViewer'
import { useEventListener } from 'hooks/useEventListener'
import { UserPreference, useUserPreference } from 'hooks/useUserPreference'
import { PipeSeparator } from 'components/PipeSeparator/PipeSeparator'
import type { DiffFileEntry } from 'utils/types'
// import { useRawDiff } from 'services/code'
import { DIFF2HTML_CONFIG, ViewStyle } from 'components/DiffViewer/DiffViewerUtils'
import { PullRequestTabContentWrapper } from '../../pages/PullRequest/PullRequestTabContentWrapper'
import { ChangesDropdown } from './ChangesDropdown'
import { DiffViewConfiguration } from './DiffViewConfiguration'
import css from './Changes.module.scss'

const STICKY_TOP_POSITION = 64
const STICKY_HEADER_HEIGHT = 150
const diffViewerId = (collection: Unknown[]) => collection.filter(Boolean).join('::::')

interface ChangesProps extends Pick<GitInfoProps, 'repoMetadata'> {
  targetBranch?: string
  sourceBranch?: string
  readOnly?: boolean
}

export const Changes: React.FC<ChangesProps> = ({ repoMetadata, targetBranch, sourceBranch, readOnly }) => {
  const { getString } = useStrings()
  const [viewStyle, setViewStyle] = useUserPreference(UserPreference.DIFF_VIEW_STYLE, ViewStyle.SIDE_BY_SIDE)
  const [lineBreaks, setLineBreaks] = useUserPreference(UserPreference.DIFF_LINE_BREAKS, false)
  const [diffs, setDiffs] = useState<DiffFileEntry[]>([])
  const [isSticky, setSticky] = useState(false)
  const {
    data: rawDiff,
    error,
    loading,
    refetch
  } = useGet<string>({
    path: `/api/v1/repos/${repoMetadata?.path}/+/compare/${targetBranch}...${sourceBranch}`,
    lazy: !targetBranch || !sourceBranch
  })
  // const { data: _diffs } = useRawDiff({
  //   repo_ref: repoMetadata?.path as string,
  //   range: `${pullRequestMetadata.target_branch}...${pullRequestMetadata.source_branch}`
  // })
  // console.log('DIFF', _diffs)

  const diffStats = useMemo(
    () =>
      (diffs || []).reduce(
        (obj, diff) => {
          obj.addedLines += diff.addedLines
          obj.deletedLines += diff.deletedLines
          return obj
        },
        { addedLines: 0, deletedLines: 0 }
      ),
    [diffs]
  )

  useEffect(() => {
    if (rawDiff) {
      setDiffs(
        Diff2Html.parse(rawDiff, DIFF2HTML_CONFIG).map(diff => {
          const viewerId = diffViewerId([diff.oldName, diff.newName])
          const containerId = `container-${viewerId}`
          const contentId = `content-${viewerId}`

          return {
            ...diff,
            containerId,
            contentId
          }
        })
      )
    }
  }, [rawDiff])

  useEventListener(
    'scroll',
    useCallback(() => setSticky(window.scrollY >= STICKY_HEADER_HEIGHT), [])
  )

  return (
    <PullRequestTabContentWrapper loading={loading} error={error} onRetry={refetch} className={css.wrapper}>
      <Container className={css.header}>
        <Layout.Horizontal>
          <Container flex={{ alignItems: 'center' }}>
            {/* Files Changed stats */}
            <Text flex className={css.diffStatsLabel}>
              <StringSubstitute
                str={getString('pr.diffStatsLabel')}
                vars={{
                  changedFilesLink: <ChangesDropdown diffs={diffs} />,
                  addedLines: formatNumber(diffStats.addedLines),
                  deletedLines: formatNumber(diffStats.deletedLines),
                  configuration: (
                    <DiffViewConfiguration
                      viewStyle={viewStyle}
                      setViewStyle={setViewStyle}
                      lineBreaks={lineBreaks}
                      setLineBreaks={setLineBreaks}
                    />
                  )
                }}
              />
            </Text>

            {/* Show "Scroll to top" button */}
            {isSticky && (
              <Layout.Horizontal padding={{ left: 'small' }}>
                <PipeSeparator height={10} />
                <Button
                  variation={ButtonVariation.ICON}
                  icon="arrow-up"
                  iconProps={{ size: 14 }}
                  onClick={() => window.scroll({ top: 0 })}
                  tooltip={getString('scrollToTop')}
                  tooltipProps={{ isDark: true }}
                />
              </Layout.Horizontal>
            )}
          </Container>
          <FlexExpander />

          {!readOnly && (
            <Button text={getString('pr.reviewChanges')} variation={ButtonVariation.PRIMARY} intent="success" />
          )}
        </Layout.Horizontal>
      </Container>

      <Layout.Vertical spacing="large" className={cx(css.main, lineBreaks ? css.enableDiffLineBreaks : '')}>
        {diffs?.map((diff, index) => (
          // Note: `key={viewStyle + index}` resets DiffView when viewStyle
          // is changed. Making it easier to control states inside DiffView itself, as it does not have to deal with viewStyle
          <DiffViewer
            readOnly={readOnly}
            index={index}
            key={viewStyle + index}
            diff={diff}
            viewStyle={viewStyle}
            stickyTopPosition={STICKY_TOP_POSITION}
          />
        ))}
      </Layout.Vertical>
    </PullRequestTabContentWrapper>
  )
}
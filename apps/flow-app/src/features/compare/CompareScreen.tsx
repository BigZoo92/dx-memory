import { useEffect, useState } from 'react'
import {
  Button,
  Card,
  CardHeader,
  FilterSelect,
  Icon,
  PageHeader,
  ComparePanel,
  Timeline,
  UserImpact,
  type SelectOption
} from '@signalops/flow-ui'
import { formatDateTime } from '../../shared/formatting/date'
import { useCompare, useSignals } from '../../shared/api/queries'
import { QueryState } from '../../shared/QueryState'

export function CompareScreen() {
  const options = useSignals({ pageSize: 25, sortBy: 'riskScore', sortDirection: 'desc' })
  const [selected, setSelected] = useState('')

  // Default to the highest-risk signal once the option list loads.
  useEffect(() => {
    if (!selected && options.data?.items.length) setSelected(options.data.items[0].id)
  }, [options.data, selected])

  const selectOptions: SelectOption[] =
    options.data?.items.map((s) => ({ value: s.id, label: `${s.id} · ${s.title}` })) ?? []

  const compare = useCompare(selected)

  return (
    <div className="so-page">
      <PageHeader title="Compare" subtitle="Before / after on a signal and its user impact." />

      <Card>
        <div className="so-row" style={{ justifyContent: 'space-between' }}>
          <div style={{ minWidth: 320, flex: '1 1 320px' }}>
            <FilterSelect
              label="Signal"
              value={selected}
              options={selectOptions}
              onChange={setSelected}
            />
          </div>
          <Button variant="secondary" onClick={() => compare.refetch()}>
            <Icon name="reset" size={15} /> Re-run
          </Button>
        </div>
      </Card>

      <QueryState query={compare}>
        {(data) => (
          <>
            <Card padded={false}>
              <CardHeader title="Attribute diff" />
              <ComparePanel attributes={data.attributes} />
            </Card>

            <div className="so-grid-detail">
              <Card>
                <CardHeader title="Timeline of changes" />
                <Timeline
                  items={data.timeline.map((event) => ({
                    title: event.label,
                    description: `${event.type} · ${event.actor}`,
                    time: formatDateTime(event.createdAt)
                  }))}
                />
              </Card>
              <div className="so-stack">
                <CardHeader title="User impact" />
                <UserImpact sentence={data.impactSentence} metrics={data.impactMetrics} />
              </div>
            </div>
          </>
        )}
      </QueryState>
    </div>
  )
}

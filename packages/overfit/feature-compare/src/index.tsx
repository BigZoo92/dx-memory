'use client'

import { useEffect, useState } from 'react'
import type { ApiError, CompareResponse, Signal } from '@signalops/overfit-contracts-generated'
import { overfitApi } from '@signalops/overfit-api-client'
import { Card, ErrorState, SkeletonRows } from '@signalops/overfit-ui'

export function ComparePage() {
  const [options, setOptions] = useState<Signal[]>([])
  const [selected, setSelected] = useState('')
  const [data, setData] = useState<CompareResponse | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    overfitApi
      .listSignals({ pageSize: 50, sortBy: 'riskScore', sortDirection: 'desc' })
      .then((d) => {
        setOptions(d.items)
        if (d.items[0]) setSelected(d.items[0].id)
      })
      .catch((e: ApiError) => setError(e))
  }, [])

  function run(id: string) {
    if (!id) return
    setLoading(true)
    setError(null)
    overfitApi
      .getCompare(id)
      .then(setData)
      .catch((e: ApiError) => setError(e))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    run(selected)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

  return (
    <div className="page">
      <div className="pageHead">
        <div>
          <h1 className="pageTitle">Compare</h1>
          <p className="pageSubtitle">Before / after on a signal, and the user impact.</p>
        </div>
        <div className="row">
          <select className="select" aria-label="Select signal" value={selected} onChange={(e) => setSelected(e.target.value)}>
            {options.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id} · {s.title}
              </option>
            ))}
          </select>
          <button className="btn btn-secondary" onClick={() => run(selected)}>
            Re-run
          </button>
        </div>
      </div>

      {loading || (!data && !error) ? (
        <SkeletonRows rows={6} />
      ) : error ? (
        <ErrorState error={error} onRetry={() => run(selected)} />
      ) : data ? (
        <>
          <Card title="Attribute diff" flush>
            <div className="tableWrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Attribute</th>
                    <th>Before</th>
                    <th></th>
                    <th>After</th>
                    <th>Change</th>
                  </tr>
                </thead>
                <tbody>
                  {data.attributes.map((a) => (
                    <tr key={a.attribute} className={a.changed ? 'diffChanged' : ''}>
                      <td className="cellTitle">{a.attribute}</td>
                      <td>{a.before}</td>
                      <td aria-hidden>{a.changed ? '→' : ''}</td>
                      <td>{a.after}</td>
                      <td className={`delta-${a.delta}`}>{a.delta === 'no-change' ? '—' : a.delta}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="grid-detail">
            <Card title="Timeline of changes">
              <div className="timeline">
                {data.timeline.length === 0 ? (
                  <div className="muted">No changes recorded.</div>
                ) : (
                  data.timeline.map((e) => (
                    <div key={e.id} className="timelineItem">
                      <span className="timelineDot" />
                      <div>
                        <div className="timelineLabel">{e.label}</div>
                        <div className="timelineMeta">
                          {e.actor} · {new Date(e.createdAt).toISOString().slice(0, 16).replace('T', ' ')}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <div className="aiCard">
              <span className="aiTag">User impact</span>
              <p style={{ margin: '10px 0' }}>{data.impactSentence}</p>
              <div className="list">
                {data.impactMetrics.map((m) => (
                  <div key={m.label} className="listRow">
                    <span>{m.label}</span>
                    <span className={`delta-${m.delta}`} style={{ fontWeight: 700 }}>
                      {m.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}

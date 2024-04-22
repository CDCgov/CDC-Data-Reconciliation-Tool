import { useState, useEffect, useMemo } from "react"
import DebouncedInput from "./DebouncedInput"
import Button from "../components/Button"
import Filter from "./Filter"
import config from "../config.json"
import { FaSortDown, FaSortUp } from "react-icons/fa6"

import {
  MdKeyboardDoubleArrowLeft,
  MdKeyboardArrowLeft,
  MdKeyboardDoubleArrowRight,
  MdKeyboardArrowRight,
  MdFileDownload,
  MdFilterAltOff,
} from "react-icons/md"

import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
} from "@tanstack/react-table"

export default function Report({ reportID }) {
  const [results, setResults] = useState(null)
  const [statistics, setStatistics] = useState(null)
  const [totalStatistics, setTotalStatistics] = useState({})
  const [showDiseaseStats, setShowDiseaseStats] = useState(false)

  const [discColumnFilters, setDiscColumnFilters] = useState([])
  const [discGlobalFilter, setDiscGlobalFilter] = useState("")

  const [statColumnFilters, setStatColumnFilters] = useState([])
  const [statGlobalFilter, setStatGlobalFilter] = useState("")

  const [diseaseStatClicked, setDiseaseStatClicked] = useState(false)
  const [currentDisease, setCurrentDisease] = useState("")
  const [currentDiscType, setCurrentDiscType] = useState("")

  const discColumns = useMemo(() => [
    {
      header: "CaseID",
      accessorKey: "CaseID",
      footer: (props) => props.column.id,
    },
    {
      header: "EventCode",
      accessorKey: "EventCode",
      footer: (props) => props.column.id,
    },
    {
      header: "EventName",
      accessorKey: "EventName",
      footer: (props) => props.column.id,
    },
    {
      header: "CaseClassStatus",
      accessorFn: (row) => row.CaseClassStatus.toString(),
      id: "CaseClassStatus",
      footer: (props) => props.column.id,
    },
    {
      header: "MMWRYear",
      accessorFn: (row) => row.MMWRYear.toString(),
      id: "MMWRYear",
      footer: (props) => props.column.id,
    },
    {
      header: "MMWRWeek",
      accessorFn: (row) => row.MMWRWeek.toString(),
      id: "MMWRWeek",
      footer: (props) => props.column.id,
    },
    {
      header: "Reason",
      accessorKey: "Reason",
      footer: (props) => props.column.id,
    },
    {
      header: "ReasonID",
      accessorFn: (row) => row.ReasonID.toString(),
      id: "ReasonID",
      footer: (props) => props.column.id,
    },
  ])

  const statColumns = useMemo(() => [
    {
      header: "Event Code",
      accessorKey: "EventCode",
      footer: (props) => props.column.id,
    },
    {
      header: "Event Name",
      accessorKey: "EventName",
      footer: (props) => props.column.id,
    },
    {
      header: "Total Cases",
      accessorFn: (row) => row.TotalCases.toString(),
      id: "TotalCases",
      footer: (props) => props.column.id,
    },
    {
      header: "Duplicates",
      accessorFn: (row) => row.TotalDuplicates.toString(),
      cell: (info) => (
        <span
          onClick={() => handleStatClick(info.column, info.row.original)}
          className='text-blue-500 cursor-pointer underline hover:text-purple-800'
        >
          {info.getValue()}
        </span>
      ),
      id: "TotalDuplicates",
      footer: (props) => props.column.id,
    },
    {
      header: "Missing From CDC",
      accessorFn: (row) => row.TotalMissingFromCDC.toString(),
      cell: (info) => (
        <span
          onClick={() => handleStatClick(info.column, info.row.original)}
          className='text-blue-500 cursor-pointer underline hover:text-purple-800'
        >
          {info.getValue()}
        </span>
      ),
      id: "TotalMissingFromCDC",
      footer: (props) => props.column.id,
    },
    {
      header: "Missing From State",
      accessorFn: (row) => row.TotalMissingFromState.toString(),
      cell: (info) => (
        <span
          onClick={() => handleStatClick(info.column, info.row.original)}
          className='text-blue-500 cursor-pointer underline hover:text-purple-800'
        >
          {info.getValue()}
        </span>
      ),
      id: "TotalMissingFromState",
      footer: (props) => props.column.id,
    },
    {
      header: "Wrong Attributes",
      accessorFn: (row) => row.TotalWrongAttributes.toString(),
      cell: (info) => (
        <span
          onClick={() => handleStatClick(info.column, info.row.original)}
          className='text-blue-500 cursor-pointer underline hover:text-purple-800'
        >
          {info.getValue()}
        </span>
      ),
      id: "TotalWrongAttributes",
      footer: (props) => props.column.id,
    },
  ])

  const discTable = useReactTable({
    data: results,
    columns: discColumns,
    state: {
      columnFilters: discColumnFilters,
      globalFilter: discGlobalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 5,
      },
    },
    onColumnFiltersChange: (columnFilters) => {
      if (diseaseStatClicked) {
        setDiseaseStatClicked(false)
        setCurrentDisease("")
        setCurrentDiscType("")
      }

      setDiscColumnFilters(columnFilters)
    },
    onGlobalFilterChange: (filter) => {
      if (diseaseStatClicked) {
        setDiseaseStatClicked(false)
        setCurrentDisease("")
        setCurrentDiscType("")
      }

      setDiscGlobalFilter(filter)
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  const statTable = useReactTable({
    data: statistics,
    columns: statColumns,
    state: {
      columnFilters: statColumnFilters,
      globalFilter: statGlobalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 5,
      },
    },
    onColumnFiltersChange: setStatColumnFilters,
    onGlobalFilterChange: setStatGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  useEffect(() => {
    setStatistics(null)
    setResults(null)
    setTotalStatistics(null)
    const fetchReportStatistics = async () => {
      try {
        const statsResponse = await fetch(config.API_URL + "/report_statistics/" + reportID)
        if (!statsResponse.ok) {
          throw new Error(`Error: ${statsResponse.statusText}`)
        }
        const statsData = await statsResponse.json()

        let totalCases = 0
        let totalDuplicates = 0
        let totalMissingFromCDC = 0
        let totalMissingFromState = 0
        let totalWrongAttributes = 0

        statsData.forEach((stat) => {
          totalCases += stat.TotalCases || 0
          totalDuplicates += stat.TotalDuplicates || 0
          totalMissingFromCDC += stat.TotalMissingFromCDC || 0
          totalMissingFromState += stat.TotalMissingFromState || 0
          totalWrongAttributes += stat.TotalWrongAttributes || 0
        })

        setStatistics(statsData)
        setTotalStatistics({
          TotalCases: totalCases,
          TotalDuplicates: totalDuplicates,
          TotalMissingFromCDC: totalMissingFromCDC,
          TotalMissingFromState: totalMissingFromState,
          TotalWrongAttributes: totalWrongAttributes,
        })
      } catch (error) {
        console.error("Unable to fetch statistics", error)
      }
    }

    if (reportID) {
      fetchReportStatistics()
      fetchReport(reportID)
    }
  }, [reportID])

  const fetchReport = async (reportID) => {
    try {
      const response = await fetch(config.API_URL + "/reports/" + reportID)
      if (response.ok) {
        const data = await response.json()
        setResults(data)
      } else {
        console.error("Failed to fetch report!")
      }
    } catch (e) {
      console.error("Error fetching report - " + e)
    }
  }

  const toggleDiseaseStats = () => {
    setShowDiseaseStats(!showDiseaseStats)
  }

  const handleResultsDownload = (e) => {
    const csvData =
      "CaseID,EventCode,EventName,CaseClassStatus,MMWRYear,MMWRWeek,Reason,ReasonID\n" +
      results
        .map(
          (result) =>
            `${result.CaseID},${result.EventCode},"${result.EventName}","${result.CaseClassStatus}",${result.MMWRYear},${result.MMWRWeek},"${result.Reason}",${result.ReasonID}`
        )
        .join("\n")
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8," })
    const linkURL = URL.createObjectURL(blob)
    const linking = document.createElement("a")
    linking.setAttribute("href", linkURL)
    linking.setAttribute("download", "Results.csv")
    linking.textContent = "Download"

    document.body.appendChild(linking)
    linking.click()
    document.body.removeChild(linking)
  }

  const handleStatsDownload = (e) => {
    const csvStatsData = 
      "EventCode,EventName,TotalCases,TotalDuplicates,TotalMissingFromCDC,TotalMissingFromState,TotalWrongAttributes\n" +
      statistics
        .map(
          (stat) => 
            `${stat.EventCode},"${stat.EventName}",${stat.TotalCases},${stat.TotalDuplicates},${stat.TotalMissingFromCDC},${stat.TotalMissingFromState},${stat.TotalWrongAttributes}`
      )
      .join("\n")

    const blob = new Blob([csvStatsData], { type: "text/csv;charset=utf-8," })
    const linkURL = URL.createObjectURL(blob)
    const linking = document.createElement("a")
    linking.setAttribute("href", linkURL)
    linking.setAttribute("download", "Statistics.csv")
    linking.textContent = "Download"

    document.body.appendChild(linking)
    linking.click()
    document.body.removeChild(linking)
  }

  const handleStatClick = (col, row) => {

    // clear the filters of the report discrepancies table
    clearDiscFilters()
    // set the current disease for the header of the report discrepancies table
    let discrepancyType = ""
    switch (col.id) {
      case "TotalDuplicates":
        discrepancyType = "Duplicates"
        if (row.TotalDuplicates === 0) return

        discTable.setColumnFilters([
          {
            id: "ReasonID",
            value: "1",
          },
          {
            id: "EventCode",
            value: row.EventCode,
          },
        ])
        break
      case "TotalMissingFromCDC":
        discrepancyType = "Missing From CDC"
        if (row.TotalMissingFromCDC === 0) return

        discTable.setColumnFilters([
          {
            id: "ReasonID",
            value: "2",
          },
          {
            id: "EventCode",
            value: row.EventCode,
          },
        ])
        break
      case "TotalWrongAttributes":
        discrepancyType = "Wrong Attributes"
        if (row.TotalWrongAttributes === 0) return

        discTable.setColumnFilters([
          {
            id: "ReasonID",
            value: "3",
          },
          {
            id: "EventCode",
            value: row.EventCode,
          },
        ])
        break
      case "TotalMissingFromState":
        discrepancyType = "Missing From State"
        if (row.TotalMissingFromState === 0) return

        discTable.setColumnFilters([
          {
            id: "ReasonID",
            value: "4",
          },
          {
            id: "EventCode",
            value: row.EventCode,
          },
        ])
        break
      default:
        discrepancyType = ""
    }
    setCurrentDiscType(discrepancyType)
    setCurrentDisease(row.EventName)
    setDiseaseStatClicked(true)
  }

  const clearDiscFilters = () => {
    discTable.setColumnFilters([])
    discTable.setGlobalFilter("")
    setDiseaseStatClicked(false)
    setCurrentDisease("")
    setCurrentDiscType("")
  }

  const clearStatFilters = () => {
    statTable.setColumnFilters([])
    statTable.setGlobalFilter("")
  }

  return (
    <div className='mt-5 py-5 px-12 mx-auto w-full max-w-[1400px] min-w-[1020px] flex flex-col items-center gap-6'>
      {results && (
        <>
          <div className='flex flex-col items-center mb-5'>
            <h2 className='text-2xl font-bold'>Results</h2>
            <h3>Number of Cases Different: {results.length}</h3>
          </div>

          {statistics && (
            <>
              {/* Overall Report Statistics */}
              <div className="border border-slate-400 rounded-xl shadow-md overflow-hidden">
                <table className='w-full text-center'>
                  <thead className='bg-[#d4e1ec]'>
                  <tr>
                    <th colSpan={5} className="text-2xl p-2">Report Statistics</th>
                  </tr>
                    <tr className='border-b-2 border-slate-900'>
                      <th className='px-4 py-2 font-semibold'>Total Cases</th>
                      <th className='px-4 py-2 font-semibold'>Total Duplicates</th>
                      <th className='px-4 py-2 font-semibold'>Total Missing From CDC</th>
                      <th className='px-4 py-2 font-semibold'>Total Missing From States</th>
                      <th className='px-4 py-2 font-semibold'>Total Wrong Attributes</th>
                    </tr>
                  </thead>
                  <tbody className='bg-white'>
                    <tr>
                      <td className='px-4 py-2'>{totalStatistics.TotalCases}</td>
                      <td className='px-4 py-2'>{totalStatistics.TotalDuplicates}</td>
                      <td className='px-4 py-2'>{totalStatistics.TotalMissingFromCDC}</td>
                      <td className='px-4 py-2'>{totalStatistics.TotalMissingFromState}</td>
                      <td className='px-4 py-2'>{totalStatistics.TotalWrongAttributes}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Toggle Button for Disease Specific Stats */}
              <Button
                text={`${showDiseaseStats ? "Hide" : "Show"} Disease Stats`}
                className='px-4 py-2 flex flex-row items-center justify-around gap-2'
                onClick={toggleDiseaseStats}>
              </Button>

              {/* Disease Specific Statistics */}
              {showDiseaseStats && (
                <div>
                  <div className='w-full flex flex-row items-center justify-between'>
                    <div className="flex items-center gap-2">
                      <DebouncedInput
                        value={statGlobalFilter ?? ""}
                        onChange={(value) => statTable.setGlobalFilter(String(value))}
                        className='p-2 font-lg shadow border border-block'
                        placeholder='Search all columns...'
                      />
                      <Button
                        text='Clear Filters'
                        className='px-5 py-2 flex flex-row items-center justify-around gap-2'
                        onClick={clearStatFilters}
                      >
                        <MdFilterAltOff size={23} />
                      </Button>
                    </div>

                    <Button
                      text='Download CSV'
                      className='px-5 py-2 flex flex-row items-center justify-around gap-2'
                      onClick={handleStatsDownload}
                    >
                      <MdFileDownload size={23} />
                    </Button>
                  </div>
                  <div className='border border-slate-400 rounded-xl shadow-md my-3 overflow-hidden'>
                    <table className='table-auto'>
                      <thead className='bg-[#d4e1ec]'>
                        <tr>
                          <th colSpan={7} className="text-2xl p-2">Disease Statistics</th>
                        </tr>
                        {statTable.getHeaderGroups().map((headerGroup) => (
                          <tr key={headerGroup.id} className='border-b border-slate-400'>
                            {headerGroup.headers.map((header) => {
                              return (
                                <th className='p-2' key={header.id} colSpan={header.colSpan}>
                                  {header.isPlaceholder ? null : (
                                    <>
                                      <div
                                        {...{
                                          className: header.column.getCanSort()
                                            ? "cursor-pointer select-none flex flex-row items-center justify-start gap-2"
                                            : "flex flex-row items-center justify-start gap-2",
                                          onClick: header.column.getToggleSortingHandler(),
                                        }}
                                      >
                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                        {{
                                          asc: <FaSortUp />,
                                          desc: <FaSortDown />,
                                        }[header.column.getIsSorted()] ?? null}
                                      </div>
                                      {header.column.getCanFilter() ? (
                                        <div>
                                          <Filter column={header.column} table={statTable} />
                                        </div>
                                      ) : null}
                                    </>
                                  )}
                                </th>
                              )
                            })}
                          </tr>
                        ))}
                      </thead>
                      <tbody>
                        {statTable.getRowModel().rows.map((row, index) => {
                          return (
                            <tr
                              {...{
                                className:
                                  index < statTable.getRowModel().rows.length - 1 ? "border-b border-slate-400" : "",
                              }}
                              key={row.id}
                            >
                              {row.getVisibleCells().map((cell) => {
                                return (
                                  <td
                                    className='p-1'
                                    key={cell.id}
                                  >
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                  </td>
                                )
                              })}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className='flex items-center gap-2 justify-center'>
                    <button
                      className='border rounded p-1 border-slate-400'
                      onClick={() => statTable.setPageIndex(0)}
                      disabled={!statTable.getCanPreviousPage()}
                    >
                      <MdKeyboardDoubleArrowLeft className='text-xl' />
                    </button>
                    <button
                      className='border rounded p-1 border-slate-400'
                      onClick={() => statTable.previousPage()}
                      disabled={!statTable.getCanPreviousPage()}
                    >
                      <MdKeyboardArrowLeft className='text-xl' />
                    </button>
                    <button
                      className='border rounded p-1 border-slate-400'
                      onClick={() => statTable.nextPage()}
                      disabled={!statTable.getCanNextPage()}
                    >
                      <MdKeyboardArrowRight className='text-xl' />
                    </button>
                    <button
                      className='border rounded p-1 border-slate-400'
                      onClick={() => statTable.setPageIndex(statTable.getPageCount() - 1)}
                      disabled={!statTable.getCanNextPage()}
                    >
                      <MdKeyboardDoubleArrowRight className='text-xl' />
                    </button>
                    <span className='flex items-center gap-1'>
                      <div>Page</div>
                      <strong>
                        {statTable.getState().pagination.pageIndex + 1} of {statTable.getPageCount()}
                      </strong>
                    </span>
                    <span className='flex items-center gap-1'>
                      | Go to page:
                      <input
                        type='number'
                        defaultValue={statTable.getState().pagination.pageIndex + 1}
                        onChange={(e) => {
                          const page = e.target.value ? Number(e.target.value) - 1 : 0
                          statTable.setPageIndex(page)
                        }}
                        className='border p-1 rounded w-16 border-slate-400'
                      />
                    </span>
                    <select
                      className='border p-1 rounded border-slate-400'
                      value={statTable.getState().pagination.pageSize}
                      onChange={(e) => {
                        statTable.setPageSize(Number(e.target.value))
                      }}
                    >
                      {[5, 10, 20, 30, 40, 50, 100].map((pageSize) => (
                        <option key={pageSize} value={pageSize}>
                          Show {pageSize}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Report Discrepancies Table */}
          <div>
            <div className='w-full flex flex-row items-center justify-between'>
              <div className="flex items-center gap-2">
                <DebouncedInput
                  value={discGlobalFilter ?? ""}
                  onChange={(value) => discTable.setGlobalFilter(String(value))}
                  className='p-2 font-lg shadow border border-block'
                  placeholder='Search all columns...'
                />
                <Button
                  text='Clear Filters'
                  className='px-5 py-2 flex flex-row items-center justify-around gap-2'
                  onClick={clearDiscFilters}
                >
                  <MdFilterAltOff size={23} />
                </Button>
              </div>

              <Button
                text='Download CSV'
                className='px-5 py-2 flex flex-row items-center justify-around gap-2'
                onClick={handleResultsDownload}
              >
                <MdFileDownload size={23} />
              </Button>
            </div>
            <div className='border border-slate-400 rounded-xl shadow-md my-3 overflow-hidden'>
              <table className='table-auto'>
                <thead className='bg-[#d4e1ec]'>
                  <tr>
                    <th colSpan={8} className="text-2xl p-2">
                      {diseaseStatClicked ? `${currentDisease} ${currentDiscType}` : 'Report Discrepancies'}
                    </th>
                  </tr>
                  {discTable.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id} className='border-b border-slate-400'>
                      {headerGroup.headers.map((header) => {
                        return (
                          <th className='p-2' key={header.id} colSpan={header.colSpan}>
                            {header.isPlaceholder ? null : (
                              <>
                                <div
                                  {...{
                                    className: header.column.getCanSort()
                                      ? "cursor-pointer select-none flex flex-row items-center justify-start gap-2"
                                      : "flex flex-row items-center justify-start gap-2",
                                    onClick: header.column.getToggleSortingHandler(),
                                  }}
                                >
                                  {flexRender(header.column.columnDef.header, header.getContext())}
                                  {{
                                    asc: <FaSortUp />,
                                    desc: <FaSortDown />,
                                  }[header.column.getIsSorted()] ?? null}
                                </div>
                                {header.column.getCanFilter() ? (
                                  <div>
                                    <Filter column={header.column} table={discTable} />
                                  </div>
                                ) : null}
                              </>
                            )}
                          </th>
                        )
                      })}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {discTable.getRowModel().rows.map((row, index) => {
                    return (
                      <tr
                        {...{
                          className: index < discTable.getRowModel().rows.length - 1 ? "border-b border-slate-400" : "",
                        }}
                        key={row.id}
                      >
                        {row.getVisibleCells().map((cell) => {
                          return (
                            <td className='p-1' key={cell.id}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className='flex items-center gap-2 justify-center'>
              <button
                className='border rounded p-1 border-slate-400'
                onClick={() => discTable.setPageIndex(0)}
                disabled={!discTable.getCanPreviousPage()}
              >
                <MdKeyboardDoubleArrowLeft className='text-xl' />
              </button>
              <button
                className='border rounded p-1 border-slate-400'
                onClick={() => discTable.previousPage()}
                disabled={!discTable.getCanPreviousPage()}
              >
                <MdKeyboardArrowLeft className='text-xl' />
              </button>
              <button
                className='border rounded p-1 border-slate-400'
                onClick={() => discTable.nextPage()}
                disabled={!discTable.getCanNextPage()}
              >
                <MdKeyboardArrowRight className='text-xl' />
              </button>
              <button
                className='border rounded p-1 border-slate-400'
                onClick={() => discTable.setPageIndex(discTable.getPageCount() - 1)}
                disabled={!discTable.getCanNextPage()}
              >
                <MdKeyboardDoubleArrowRight className='text-xl' />
              </button>
              <span className='flex items-center gap-1'>
                <div>Page</div>
                <strong>
                  {discTable.getState().pagination.pageIndex + 1} of {discTable.getPageCount()}
                </strong>
              </span>
              <span className='flex items-center gap-1'>
                | Go to page:
                <input
                  type='number'
                  defaultValue={discTable.getState().pagination.pageIndex + 1}
                  onChange={(e) => {
                    const page = e.target.value ? Number(e.target.value) - 1 : 0
                    discTable.setPageIndex(page)
                  }}
                  className='border p-1 rounded w-16 border-slate-400'
                />
              </span>
              <select
                className='border p-1 rounded border-slate-400'
                value={discTable.getState().pagination.pageSize}
                onChange={(e) => {
                  discTable.setPageSize(Number(e.target.value))
                }}
              >
                {[5, 10, 20, 30, 40, 50, 100].map((pageSize) => (
                  <option key={pageSize} value={pageSize}>
                    Show {pageSize}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

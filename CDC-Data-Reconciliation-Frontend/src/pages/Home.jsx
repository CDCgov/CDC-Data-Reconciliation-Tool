import { useEffect, useState } from "react"
import Report from "../components/Report"
import Button from "../components/Button"
import Modal from "../components/Modal"
import CreateReport from "../components/CreateReport"
import Popover from "../components/Popover"
import config from "../config.json"

export default function Home() {
  const [reportSummaries, setReportSummaries] = useState(null)
  const [currReport, setCurrReport] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [renameModalOpen, setRenameModalOpen] = useState(false)
  const [renameName, setRenameName] = useState('')
  const [visibleReportsCount, setVisibleReportsCount] = useState(5)
  const [modifyingReportId, setModifyingReportId] = useState(null)
  const [modifyingReportName, setModifyingReportName] = useState(null)

  const dotsOptions = [
    "Rename",
    "Delete",
  ]

  // Get the report summaries on page load
  useEffect(() => {
    fetchReportSummaries()
  }, [])

  const fetchReportSummaries = async () => {
    try {
      const response = await fetch(config.API_URL + "/reports")
      if (response.ok) {
        const data = await response.json()
        setReportSummaries(data)
      } else {
        console.error("Failed to fetch report summaries!")
      }
    } catch (e) {
      console.error("Error fetching report summaries - " + e)
    }
  }

  const handleSummaryClick = (id) => {
    setCurrReport(id)
  }

  const handleCreatedReport = () => {
    setIsModalOpen(false)
    fetchReportSummaries()
    setVisibleReportsCount(5)
  }

  const handleOptionClick = (option, id, name) => {
    setModifyingReportName(name)
    setModifyingReportId(id)
    if (option === "Delete") {
      setDeleteModalOpen(true)
    } else if (option === "Rename") {
      setRenameModalOpen(true)
    }
  }

  const handleDeleteReport = async () => {
    try {
      const response = await fetch(config.API_URL + "/reports/" + modifyingReportId, {method: "DELETE"})
      if (response.ok) {
        if (modifyingReportId === currReport) {
          setCurrReport(null)
        }
        fetchReportSummaries()
      }
      else {
        console.error("Failed to delete report " + modifyingReportId)
      }
    }
    catch (e) {
      console.error("Error deleting report - " + e)
    }
  }

  const handleRenameReport = async (e) => {
    setRenameModalOpen(false)
    const newName = renameName
    // Clear entry field
    setRenameName('')
    e.preventDefault()
    const response = await fetch(config.API_URL + `/reports?report_id=${modifyingReportId}&new_name=${newName}`, {
      method: "POST"
    })
    try {
      if (response.ok) {
        fetchReportSummaries()
      }
      else {
        console.error("Failed to rename report " + modifyingReportId)
      }
    }
    catch (e) {
      console.error("Error renaming report - " + e)
    }
  }

  const handleRenameFieldChange = (e) => {
    setRenameName(e.target.value)
  }

  return (
    <>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <CreateReport onDone={() => handleCreatedReport()} />
      </Modal>
      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)}>
        <div className='bg-white rounded-md p-5'>
          <h2 className="text-black text-lg">
            Are you sure you wish to delete report {modifyingReportName}?
          </h2>
          <h2 className="text-black text-md text-center">
            Any archived CSVs are not deleted.
          </h2>
          <div className="flex flex-row justify-center gap-10 m-2 mt-5 left-0">
            <Button
              text='Cancel'
              className='px-4 py-2 shadow-lg'
              onClick={() => setDeleteModalOpen(false)}>
            </Button>
            <button className="text-white rounded-md bg-[#e66157] hover:bg-[#c33124] px-4 py-2 shadow-lg"
              onClick={() => {setDeleteModalOpen(false); handleDeleteReport();}}>
              Delete
            </button>
          </div>
        </div>
      </Modal>
      <Modal isOpen={renameModalOpen} onClose={() => setRenameModalOpen(false)}>
        <div className='bg-white rounded-md p-5'>
          <form onSubmit={handleRenameReport}>
            <h2 className="text-black text-lg pb-3">
              Enter the new name for report {modifyingReportName}:
            </h2>
            <input
              type='text'
              id='new_name'
              onChange={handleRenameFieldChange}
              className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline'
              placeholder='Enter the new name'
              value={renameName}
            />
            <div className="flex flex-row justify-center gap-10 m-2 mt-5 left-0">
              <Button
                text='Cancel'
                className='px-4 py-2 shadow-lg'
                onClick={() => setRenameModalOpen(false)}>
              </Button>
              <Button
                text='Rename'
                type='submit'
                className='px-4 py-2 shadow-lg'
                onClick={() => {}}>
              </Button>
            </div>
          </form>
        </div>
      </Modal>
      <div className='flex flex-row items-center h-full w-full'>
        <div className='min-w-[300px] max-w-[300px] bg-slate-200 h-full flex flex-col items-center gap-4 p-1 pt-8 pb-8 overflow-auto'>
          <Button
            text='Create New Report'
            className='px-4 py-2 shadow-lg'
            onClick={() => setIsModalOpen(true)}>
          </Button>
          {reportSummaries &&
            reportSummaries.slice(0, visibleReportsCount).map((summary) => (
              <div
                key={summary.ID}
                onClick={() => handleSummaryClick(summary.ID)}
                className={`w-4/5 rounded-md p-4 shadow-lg text-slate-950 ${
                  summary.ID === currReport ? "bg-[#b8cde0] cursor-default" : "bg-white hover:bg-slate-100 cursor-pointer"
                }`}
              >
                <h2 className='text-xl font-semibold'>
                  <span className="text-wrap">
                    {summary.Name}
                  </span>
                  <span className="float-right -mx-1">
                  <Popover
                    content={
                      dotsOptions.map((option) => (
                        <div 
                          key={option}
                          onClick={(e) => {handleOptionClick(option, summary.ID, summary.Name); e.stopPropagation();}} 
                          className="text-lg font-normal hover:text-slate-500 cursor-pointer select-none">
                            {option}
                        </div>
                      ))
                    } 
                  >
                    <span className="relative cursor-pointer hover:text-slate-500">
                      <p className="px-1 select-none">⋯</p>
                    </span>
                  </Popover>
                  </span>
                </h2>
                <h2>Discrepancies: {summary.NumberOfDiscrepancies}</h2>
                <h2>{new Date(`${summary.CreatedAtDate}T${summary.TimeOfCreation}Z`).toLocaleString("en-US")}</h2>
              </div>
            ))}
            {reportSummaries && visibleReportsCount < reportSummaries.length && (
              <div>
                <Button
                  text='See More'
                  className= 'px-3 py-1 text-sm'
                  onClick={() => setVisibleReportsCount(reportSummaries.length)}>
                </Button>
              </div>
            )}
        </div>
        <div className='bg-slate-50 w-full h-full overflow-auto'>
          <Report reportID={currReport} />
        </div>
      </div>
    </>
  )
}

import { useState } from "react"
import Button from '../components/Button'
import config from "../config.json"

export default function CreateReport({ onDone }) {
  const [stateFile, setStateFile] = useState(null)
  const [cdcFile, setCDCFile] = useState(null)
  const [isAutomatic, setIsAutomatic] = useState(true)
  const [inputValue, setInputValue] = useState('')
  const [isCDCFilter, setIsCDCFilter] = useState(true)
  const [showError, setShowError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedAttributes, setSelectedAttributes] = useState([
    "EventCode", "EventName", "MMWRYear", "MMWRWeek", "CountyReporting", "CaseClassStatus",
    "Sex", "BirthDate", "Age", "AgeType", "Race", "Ethnicity"
  ])
  const [reportName, setReportName] = useState('')

  const currYear = 2023
  const yearList = Array.from({ length: 101}, (_, index) => currYear + index)

  const handleCheckboxChange = (e) => {
    setIsAutomatic(e.target.checked)
  }

  const handleCDCFilterChange = (e) => {
    setIsCDCFilter(e.target.checked)
  }

  const handleStateFileChange = (e) => {
    setStateFile(e.target.files[0])
  }

  const handleCDCFileChange = (e) => {
    setCDCFile(e.target.files[0])
  }
  const handleInputChange = (e) => {
    setInputValue(e.target.value)
  }

  const handleAttributeChange = (attribute, checked) => {
    if (checked) {
      setSelectedAttributes([...selectedAttributes, attribute])
    } else {
      setSelectedAttributes(selectedAttributes.filter(attr => attr !== attribute))
    }
  }

  const handleReportNameChange = (e) => {
    setReportName(e.target.value)
  }

  function formatErrorMessage(errors) {
    if (errors.length === 2) {
      return `${errors[0].charAt(0).toUpperCase() + errors[0].slice(1)} and ${errors[1]}.`
    }
    return errors.map((msg, index) => 
      index === 0 ? msg.charAt(0).toUpperCase() + msg.slice(1) : msg
    ).join(errors.length > 2 ? ", " : ", ").replace(/, (?=[^,]*$)/, ", and ") + "."
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Checking whether the checkbox for automatic upload is ticked or not
    if (isAutomatic) {
      var fileFlag = false
      if (cdcFile === null) {
        console.error("File not uploaded!")
        fileFlag = true
      }
      var queryFlag = false
      if (!inputValue) {
        console.error("Year not selected!")
        queryFlag = true
      }
      var attributesFlag = false
      if (selectedAttributes.length === 0) {
        console.error("No attributes selected!")
        attributesFlag = true
      }

      // Making the popup appear for the various errors that can occur, no files, no year to query, and/or no attributes selected.
      if (fileFlag || queryFlag || attributesFlag) {
        errors = []
        if (fileFlag) errors.push("File not uploaded")
        if (queryFlag) errors.push("Year not selected")
        if (attributesFlag) errors.push("No attributes selected")
        var errorMessage = formatErrorMessage(errors)
        setShowError(true)
        setErrorMessage(errorMessage)
        return
      }

      // Setting form data to year, cdcFile, and attributes
      const formdata = new FormData()
      formdata.append("cdc_file", cdcFile)
      formdata.append("attributes", JSON.stringify(selectedAttributes))
      // Run the automatic report fetching
      try {
        const response = await fetch(config.API_URL + 
          `/automatic_report?year=${inputValue}&isCDCFilter=${isCDCFilter}&reportName=${reportName}`, {
          method: "POST",
          body: formdata,
        })

        if (response.ok) {
          console.log("Automatic report fetched successfully!")
          onDone()
        } else {
          console.error("Failed to fetch automatic report!")
          setShowError(true)
          const res = await response.json()
          const errorMessage = res.detail
          setErrorMessage(errorMessage)
        }
      } catch (e) {
        console.error("Error fetching automatic report - " + e)
        setShowError(true)
        if (typeof e.message === 'string') {
          setErrorMessage(e.message)
        } else {
          setErrorMessage("Internal Server Error")
        }
      }

      // ran if the automatic report checkbox is not ticked
    } else {
      if (stateFile === null || cdcFile === null || selectedAttributes.length === 0) {
        console.error("Files not uploaded and/or no attributes are selected!")
        var errors = []
        if (stateFile === null) {
          errors.push("State file not uploaded")
        }
        if (cdcFile === null) {
          errors.push("CDC file not uploaded")
        }
        if (selectedAttributes.length === 0) {
          errors.push("No attributes selected")
        }
        var errorMessage = formatErrorMessage(errors)
        setShowError(true)
        setErrorMessage(errorMessage)
        return
      }

      const formdata = new FormData()
      formdata.append("state_file", stateFile)
      formdata.append("cdc_file", cdcFile)
      formdata.append("attributes", JSON.stringify(selectedAttributes))

      try {
        const response = await fetch(config.API_URL + `/manual_report?isCDCFilter=${isCDCFilter}&reportName=${reportName}`, {
          method: "POST",
          body: formdata,
        })

        if (response.ok) {
          console.log("Files uploaded successfully!")
          onDone()
        } else {
          console.error("Files failed to upload!")
          setShowError(true)
          const res = await response.json()
          const errorMessage = res.detail
          setErrorMessage(errorMessage)
        }
      } catch (e) {
        console.error("Error Creating Report - " + e)
        setShowError(true)
        if (typeof e.message === 'string') {
          setErrorMessage(e.message)
        } else {
          setErrorMessage("Internal Server Error")
        }
      }
    }
  }

  const Error = ({ message }) => (
    <>
      {/* Overlay div */}
      <div className="fixed top-0 left-0 right-0 bottom-0 bg-black bg-opacity-50 z-40"/>

      {/* Popup div */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-5 z-50 w-auto text-center rounded">
        <label className="font-bold text-black text-xl mb-4 block">
          Error Creating Report
        </label>
        <p className="mb-4">{message}</p>
        <Button
          text='Close'
          className='px-4 py-2 mt-4'
          onClick={() => setShowError(false)}>
        </Button>
      </div>
    </>
  )

  return (
    <div className='flex flex-col items-center py-5'>
      {
      // inserting the popup with the error message if the reponse does not come back ok
      }
      {showError && <Error message={errorMessage} />}
      <div className='bg-white w-[400px] rounded-md mx-auto'>
        <form onSubmit={handleSubmit} className='h-full'>
          <div className='flex flex-col gap-6  h-full my-8'>
            <div className="items-center justify-center mx-auto">
              <label className="font-bold text-black text-2xl" >Create New Report</label>
            </div>
            <label>
              <input type='checkbox'className="ml-4 mr-2" checked={isAutomatic} onChange={handleCheckboxChange} />
              Use Automatic Report
            </label>
            <hr></hr>
            <label htmlFor='cdc_file' className="font-bold ml-4">Upload CDC <span className="italic">.csv</span> File:</label>
            <div className="-mt-4 ml-4">
              <input type='file' id='cdc_file' onChange={handleCDCFileChange}  />
            </div>
            <hr></hr>
            {isAutomatic && (
            <>

            <label className="font-bold ml-4">Specify Year to Query From: </label>
            <select className="-mt-4 border border-black rounded-sm bg-gray-100 text-left  ml-4 w-[150px]"
              value={inputValue}
              onChange={handleInputChange}
            >
              <option
                value="">Select a Year
              </option>
              {yearList.map((year) => (
                <option
                  key={year}
                  value={year}>{year}
                </option>
              ))}
            </select>
            <hr></hr>

            <div>
              <label htmlFor='attributes' className="font-bold ml-4">Select Attributes to Compare:</label>
              <div className="mt-2 ml-4 grid grid-cols-2 gap-2 justify-center items-center">
                {["EventCode", "EventName", "MMWRYear", "MMWRWeek", "CountyReporting", "CaseClassStatus", 
                "Sex", "BirthDate", "Age", "AgeType", "Race", "Ethnicity"]
                .map((attribute) => (
                  <div key={attribute} className="px-1">
                    <input 
                      type="checkbox"
                      id={attribute}
                      value={attribute}
                      checked={selectedAttributes.includes(attribute)}
                      onChange={(e) => handleAttributeChange(attribute, e.target.checked)}
                    />
                    <label htmlFor={attribute} className="ml-2">{attribute}</label>
                  </div>
                ))}
              </div>
            </div>
            
            </>
            )}
            {!isAutomatic && (
              <>
                <label htmlFor='state_file' className="font-bold ml-4">Upload State <span className="italic">.csv</span> File:</label>
                <div className="ml-4">
                  <input type='file' id='state_file' onChange={handleStateFileChange} />
                </div>
                <hr></hr>
                
                <label htmlFor='attributes' className="font-bold ml-4">Select Attributes to Compare:</label>
                <div className="-mt-4 ml-4 grid grid-cols-2 gap-2 justify-center items-center">
                {["EventCode", "EventName", "MMWRYear", "MMWRWeek", "CountyReporting", "CaseClassStatus", 
                "Sex", "BirthDate", "Age", "AgeType", "Race", "Ethnicity"]
                .map((attribute) => (
                  <div key={attribute} className="px-1">
                    <input 
                      type="checkbox"
                      id={attribute}
                      value={attribute}
                      checked={selectedAttributes.includes(attribute)}
                      onChange={(e) => handleAttributeChange(attribute, e.target.checked)}
                    />
                    <label htmlFor={attribute} className="ml-2">{attribute}</label>
                  </div>
                ))}
              </div>
              </>
            )}
            <hr></hr>
            <label>
              <input 
                type='checkbox' 
                className="ml-4 mr-2" 
                checked={isCDCFilter} 
                onChange={handleCDCFilterChange} 
              />
              Compare Diseases Only From CDC Dataset
            </label>
            <hr></hr>
            <label htmlFor='reportName' className="font-bold ml-4">Enter a name for the report (optional):</label>
            <input
              type='text'
              id='reportName'
              onChange={handleReportNameChange}
              className='shadow appearance-none border rounded py-2 px-3 mx-3 -mt-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline'
              placeholder='Enter the name'
              value={reportName}
            />

            <div className="items-center justify-center mx-auto">
              <Button
                type='submit'
                text='Submit'
                onClick={() => {}}
                className='px-4 py-2 w-20'>
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

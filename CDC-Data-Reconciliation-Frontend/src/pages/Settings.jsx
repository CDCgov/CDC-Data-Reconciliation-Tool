import { useEffect, useState } from "react"
import config from "../config.json"
import Button from "../components/Button"

export default function Settings() {
  const [tempArchivePath, setTempArchivePath] = useState('')
  const [archivePath, setArchivePath] = useState('')
  const [password, setPassword] = useState('')
  const [passFailed, setPassFailed] = useState(false)
  const [success, setSuccess] = useState(false)
  const [archiveEmpty, setArchiveEmpty] = useState(true)

  const handleArchivePathChange = (e) => {
    setTempArchivePath(e.target.value)
  }

  const handlePasswordChange = (e) => {
    setPassword(e.target.value)
  }

  // Get the config data on page load
  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      const response = await fetch(config.API_URL + "/config/archive_path")
      if (response.ok) {
        const data = await response.json()
        if (data.length > 0) {
          setArchivePath(data)
          setArchiveEmpty(false)
          console.log("Fetched config - archive path is " + data)
        } else {
          console.log("Fetched config, but there's no setting for archive path yet.")
          setArchiveEmpty(true)
        }
      } else {
        console.error("Failed to fetch config!")
      }
    } catch (e) {
      console.error("Error fetching config - " + e)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    console.log("Submitting archive path " + tempArchivePath)
    try {
      const response = await fetch(config.API_URL + `/config?field_name=archive_path&value=${tempArchivePath}&password=${password}`, {
        method: "POST"
      })

      if (response.ok) {
        setArchivePath(tempArchivePath)
        setArchiveEmpty(false)
        console.log("Config submitted successfully!")
        setPassFailed(false)
        setSuccess(true)
      } else {
        console.error("Failed to submit config!")
        setPassFailed(true)
        setSuccess(false)
      }
    } catch (e) {
      console.error("Error submitting config - " + e)
    }
  }

  return (
    <div className='max-w-lg mx-auto p-8'>
      <h1 className='text-3xl font-bold text-center mb-6'>Configure Settings</h1>
      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <div className='mb-4'>
          <label htmlFor='archive_path' className='block text-gray-700 text-sm font-bold mb-2'>
            Current archive folder path: {archivePath}
          </label>
          <input
            type='text'
            id='archive_path'
            onChange={handleArchivePathChange}
            className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline'
            placeholder={archiveEmpty ? 'Enter archive path' : 'Edit archive path'}
            value={tempArchivePath}
          />

        <div className='mt-4'>
          {archiveEmpty && <p className='text-red-500 text-s bold text-center'>
              Warning: archive path is unset.<br></br>
              Created reports will not be downloaded automatically.</p>}
        </div>
        </div>
        <div className='mb-6'>
          <label htmlFor='password' className='block text-gray-700 text-sm font-bold mb-2'>
            Password
          </label>
          <input
            type='password'
            id='password'
            onChange={handlePasswordChange}
            className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline'
            placeholder='Enter password'
          />
          {/* Placeholder for message */}
          <div className='h-6 p-4'>
            {passFailed && <p className='text-red-500 text-s italic text-center'>Incorrect password!</p>}
            {success && <p className='text-green-500 text-s italic text-center'>Successfully updated settings!</p>}
          </div>
        </div>
        <div className='flex justify-center mt-4'>
          <Button
            type='submit'
            text='Submit'
            onClick={() => {}}
            className='py-2 px-4 focus:outline-none focus:shadow-outline'
          />
        </div>
      </form>
    </div>
  )
}

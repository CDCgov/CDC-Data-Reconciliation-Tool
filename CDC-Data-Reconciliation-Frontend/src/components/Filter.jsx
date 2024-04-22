import { useMemo } from "react"
import DebouncedInput from "./DebouncedInput"

export default function Filter({ column }) {
  const columnFilterValue = column.getFilterValue()

  const sortedUniqueValues = useMemo(
    () => Array.from(column.getFacetedUniqueValues().keys()).sort(),
    [column.getFacetedUniqueValues()]
  )

  return (
    <>
      <datalist id={column.id + "list"}>
        {sortedUniqueValues.slice(0, 5000).map((value) => (
          <option value={value} key={value} />
        ))}
      </datalist>
      <DebouncedInput
        type='text'
        value={columnFilterValue ?? ""}
        onChange={(value) => {
          if (columnFilterValue === value) return
          column.setFilterValue(String(value))
        }}
        placeholder={`Search... (${column.getFacetedUniqueValues().size})`}
        className='border shadow rounded w-full px-2 font-normal'
        list={column.id + "list"}
      />
    </>
  )
}

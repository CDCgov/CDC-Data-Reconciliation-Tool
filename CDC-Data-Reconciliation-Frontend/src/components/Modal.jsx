export default function Modal({ isOpen, onClose, children }) {
  return (
    isOpen && (
      <div
        className='fixed top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-50 overflow-auto z-50'
        onClick={onClose}
      >
        <div className="max-h-screen" onClick={(e) => e.stopPropagation()}>{children}</div>
      </div>
    )
  )
}

export default function Button({ type = 'button', text, onClick, className, children}) {
    return (
        <button
            className={`bg-[#7aa2c4] text-white rounded-md hover:bg-[#4c80ae] ${className}`}
            type={type}
            onClick={onClick}
        >
            {text}
            {children}
        </button>
    )
}

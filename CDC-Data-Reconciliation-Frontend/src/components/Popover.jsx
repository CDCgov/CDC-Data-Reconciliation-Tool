import { useEffect, useRef, useState } from "react";

function Popover({
  children,
  content,
  trigger = "click"
}) {
  const [show, setShow] = useState(false);
  const wrapperRef = useRef(null);

  const handleMouseOver = () => {
    if (trigger === "hover") {
      setShow(true);
    };
  };

  const handleMouseLeft = () => {
    if (trigger === "hover") {
      setShow(false);
    };
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current){// && !wrapperRef.current.contains(event.target)) {
        // If you have an issue where you click Delete or Rename and the popover disappears but
        // the modal does not appear, increase this number (how long in ms the popover will
        // stay and allow the modal to appear)
        setTimeout(() => setShow(false), 150)
      }
    }

    if (show) {
      // Bind the event listener
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        // Unbind the event listener on clean up
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [show, wrapperRef]);

  return (
    <div
      ref={wrapperRef}
      onMouseEnter={handleMouseOver}
      onMouseLeave={handleMouseLeft}
      onClick={(e) => e.stopPropagation()}
      className="w-fit h-fit relative flex justify-center">
      <div
        onClick={() => setShow(!show)}
      >
        {children}
      </div>
      <div
        hidden={!show}
        className="absolute top-[100%]"> 
        <div className="rounded bg-white p-3 shadow-lg">
          {content}
        </div>
      </div>
    </div>
  );
};

export default Popover;

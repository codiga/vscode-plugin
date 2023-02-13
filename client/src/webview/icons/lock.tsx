import * as React from "react";

export const LockClosed = (props: {
  width: number;
  height: number;
  color: string;
}) => {
  return (
    <svg
      width={props.width}
      height={props.height}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M14.5 8H14V6.5C14 4.019 11.981 2 9.5 2C7.019 2 5 4.019 5 6.5V8H4.5C3.673 8 3 8.673 3 9.5V17.5C3 18.327 3.673 19 4.5 19H14.5C15.327 19 16 18.327 16 17.5V9.5C16 8.673 15.327 8 14.5 8ZM6 6.5C6 4.57 7.57 3 9.5 3C11.43 3 13 4.57 13 6.5V8H6V6.5ZM15 17.5C15 17.776 14.776 18 14.5 18H4.5C4.224 18 4 17.776 4 17.5V9.5C4 9.224 4.224 9 4.5 9H14.5C14.776 9 15 9.224 15 9.5V17.5Z"
        fill={props.color}
      />
    </svg>
  );
};

export const LockOpen = (props: {
  width: number;
  height: number;
  color: string;
}) => {
  return (
    <svg
      width={props.width}
      height={props.height}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M13.75 0.833252C11.2231 0.833252 9.16667 2.88964 9.16667 5.41659V7.96288H1.52778C0.685463 7.96288 0 8.64834 0 9.49066V17.6388C0 18.4811 0.685463 19.1666 1.52778 19.1666H11.713C12.5553 19.1666 13.2407 18.4811 13.2407 17.6388V9.49066C13.2407 8.64834 12.5553 7.96288 11.713 7.96288H10.1852V5.41659C10.1852 3.45084 11.7843 1.85177 13.75 1.85177C15.7157 1.85177 17.3148 3.45084 17.3148 5.41659V6.4351C17.3148 6.71622 17.543 6.94436 17.8241 6.94436C18.1052 6.94436 18.3333 6.71622 18.3333 6.4351V5.41659C18.3333 2.88964 16.2769 0.833252 13.75 0.833252ZM11.713 8.9814C11.9941 8.9814 12.2222 9.20955 12.2222 9.49066V17.6388C12.2222 17.9199 11.9941 18.1481 11.713 18.1481H1.52778C1.24667 18.1481 1.01852 17.9199 1.01852 17.6388V9.49066C1.01852 9.20955 1.24667 8.9814 1.52778 8.9814H11.713Z"
        fill={props.color}
      />
    </svg>
  );
};
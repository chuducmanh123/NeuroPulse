import React, { ViewTransition } from "react";

export default function RootTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ViewTransition
      enter={{
        "nav-forward": "nav-forward",
        "nav-back": "nav-back",
        "nav-switch": "nav-switch",
        default: "page-crossfade",
      }}
      exit={{
        "nav-forward": "nav-forward",
        "nav-back": "nav-back",
        "nav-switch": "nav-switch",
        default: "page-crossfade",
      }}
      default="none"
    >
      {children}
    </ViewTransition>
  );
}

import * as React from "react";

type IconProps = React.SVGAttributes<SVGSVGElement> & { size?: number };

const Base = ({ size = 16, children, ...props }: IconProps & { children: React.ReactNode }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    {children}
  </svg>
);

export const ChevronRight = (p: IconProps) => <Base {...p}><polyline points="9 6 15 12 9 18" /></Base>;
export const ChevronDown  = (p: IconProps) => <Base {...p}><polyline points="6 9 12 15 18 9" /></Base>;
export const ChevronUp    = (p: IconProps) => <Base {...p}><polyline points="6 15 12 9 18 15" /></Base>;
export const ChevronLeft  = (p: IconProps) => <Base {...p}><polyline points="15 6 9 12 15 18" /></Base>;
export const Plus         = (p: IconProps) => <Base {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></Base>;
export const Minus        = (p: IconProps) => <Base {...p}><line x1="5" y1="12" x2="19" y2="12"/></Base>;
export const Eye          = (p: IconProps) => <Base {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></Base>;
export const EyeOff       = (p: IconProps) => <Base {...p}><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 11s3.5 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></Base>;
export const Search       = (p: IconProps) => <Base {...p}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></Base>;
export const Share        = (p: IconProps) => <Base {...p}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></Base>;
export const Download     = (p: IconProps) => <Base {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></Base>;
export const Sparkle      = (p: IconProps) => <Base {...p}><path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6L12 3z"/></Base>;
export const Cube         = (p: IconProps) => <Base {...p}><path d="M12 2L3 7v10l9 5 9-5V7l-9-5z"/><path d="M3 7l9 5 9-5"/><line x1="12" y1="12" x2="12" y2="22"/></Base>;
export const X            = (p: IconProps) => <Base {...p}><line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/></Base>;
export const Loader       = (p: IconProps) => <Base {...p}><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></Base>;

// Architectural toolbar icons
export const Select    = (p: IconProps) => <Base {...p}><path d="M3 3l7.5 17 2.5-7 7-2.5z"/></Base>;
export const Wall      = (p: IconProps) => <Base {...p}><line x1="3" y1="12" x2="21" y2="12" strokeWidth="3"/><line x1="3" y1="9" x2="3" y2="15"/><line x1="21" y1="9" x2="21" y2="15"/></Base>;
export const Door      = (p: IconProps) => <Base {...p}><path d="M4 20V8h6"/><path d="M10 8a10 10 0 0 1 10 10"/><line x1="20" y1="18" x2="20" y2="20"/></Base>;
export const Window    = (p: IconProps) => <Base {...p}><rect x="4" y="6" width="16" height="12"/><line x1="4" y1="10" x2="20" y2="10"/><line x1="4" y1="14" x2="20" y2="14"/></Base>;
export const Room      = (p: IconProps) => <Base {...p}><rect x="4" y="4" width="16" height="16"/><circle cx="4" cy="4" r="1.5" fill="currentColor"/><circle cx="20" cy="4" r="1.5" fill="currentColor"/><circle cx="4" cy="20" r="1.5" fill="currentColor"/><circle cx="20" cy="20" r="1.5" fill="currentColor"/></Base>;
export const Fixture   = (p: IconProps) => <Base {...p}><path d="M6 14v-3a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3"/><path d="M4 18h16"/><path d="M6 14h12v4"/></Base>;
export const Dimension = (p: IconProps) => <Base {...p}><line x1="3" y1="12" x2="21" y2="12"/><polyline points="6 9 3 12 6 15"/><polyline points="18 9 21 12 18 15"/><line x1="3" y1="6" x2="3" y2="18"/><line x1="21" y1="6" x2="21" y2="18"/></Base>;

// Toolbar utility icons
export const Snap   = (p: IconProps) => <Base {...p}><circle cx="12" cy="12" r="2"/><line x1="12" y1="3" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="21"/><line x1="3" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="21" y2="12"/></Base>;
export const Grid   = (p: IconProps) => <Base {...p}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></Base>;
export const Ortho  = (p: IconProps) => <Base {...p}><polyline points="4 20 4 4 20 4"/><line x1="4" y1="12" x2="14" y2="12"/></Base>;
export const Undo   = (p: IconProps) => <Base {...p}><polyline points="9 14 4 9 9 4"/><path d="M4 9h11a5 5 0 0 1 5 5v0a5 5 0 0 1-5 5h-7"/></Base>;
export const Redo   = (p: IconProps) => <Base {...p}><polyline points="15 14 20 9 15 4"/><path d="M20 9H9a5 5 0 0 0-5 5v0a5 5 0 0 0 5 5h7"/></Base>;

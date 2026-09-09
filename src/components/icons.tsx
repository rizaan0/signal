import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({ children, ...props }: IconProps) {
  return (
    <svg
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
}

export function PlusIcon(props: IconProps) {
  return <IconBase {...props}><path d="M12 5v14M5 12h14" /></IconBase>;
}

export function InboxIcon(props: IconProps) {
  return <IconBase {...props}><path d="M4 5.5h16v12.75A1.75 1.75 0 0 1 18.25 20H5.75A1.75 1.75 0 0 1 4 18.25V5.5Z" /><path d="m4 14 4.5.25 1.5 2h4l1.5-2L20 14" /></IconBase>;
}

export function SearchIcon(props: IconProps) {
  return <IconBase {...props}><circle cx="10.75" cy="10.75" r="6.5" /><path d="m16 16 4 4" /></IconBase>;
}

export function HistoryIcon(props: IconProps) {
  return <IconBase {...props}><path d="M4.5 8.5H1.75V5.75" /><path d="M3 8a9 9 0 1 1-.5 7" /><path d="M12 7.5V12l3 2" /></IconBase>;
}

export function UserIcon(props: IconProps) {
  return <IconBase {...props}><circle cx="12" cy="8" r="3.5" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></IconBase>;
}

export function SettingsIcon(props: IconProps) {
  return <IconBase {...props}><circle cx="12" cy="12" r="3" /><path d="M19 13.5v-3l-2-.65a6 6 0 0 0-.7-1.7l.95-1.85-2.1-2.1-1.85.95a6 6 0 0 0-1.7-.7L11 2.5H8l-.65 1.95a6 6 0 0 0-1.7.7L3.8 4.2 1.7 6.3l.95 1.85a6 6 0 0 0-.7 1.7L0 10.5v3l1.95.65a6 6 0 0 0 .7 1.7L1.7 17.7l2.1 2.1 1.85-.95a6 6 0 0 0 1.7.7L8 21.5h3l.65-1.95a6 6 0 0 0 1.7-.7l1.85.95 2.1-2.1-.95-1.85a6 6 0 0 0 .7-1.7L19 13.5Z" transform="translate(2.5)" /></IconBase>;
}

export function HelpIcon(props: IconProps) {
  return <IconBase {...props}><circle cx="12" cy="12" r="9" /><path d="M9.75 9a2.4 2.4 0 1 1 3.3 2.22c-.72.32-1.05.78-1.05 1.53v.25" /><path d="M12 17h.01" /></IconBase>;
}

export function LogoutIcon(props: IconProps) {
  return <IconBase {...props}><path d="M10 4H5.5A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20H10" /><path d="m15 8 4 4-4 4M9 12h10" /></IconBase>;
}

export function MenuIcon(props: IconProps) {
  return <IconBase {...props}><path d="M4 7h16M4 12h16M4 17h16" /></IconBase>;
}

export function PanelLeftIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3.5" y="4" width="17" height="16" rx="2.5" />
      <path d="M9.5 4v16" />
    </IconBase>
  );
}

export function CloseIcon(props: IconProps) {
  return <IconBase {...props}><path d="m6 6 12 12M18 6 6 18" /></IconBase>;
}

export function ChevronDownIcon(props: IconProps) {
  return <IconBase {...props}><path d="m7 9.5 5 5 5-5" /></IconBase>;
}

export function SendIcon(props: IconProps) {
  return <IconBase {...props}><path d="M12 19V5M6.5 10.5 12 5l5.5 5.5" /></IconBase>;
}

export function MicIcon(props: IconProps) {
  return <IconBase {...props}><rect x="8.5" y="3" width="7" height="12" rx="3.5" /><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6" /></IconBase>;
}

export function MailIcon(props: IconProps) {
  return <IconBase {...props}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></IconBase>;
}

export function BellIcon(props: IconProps) {
  return <IconBase {...props}><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 8h18c0-1-3-1-3-8" /><path d="M10 21h4" /></IconBase>;
}

export function ShieldIcon(props: IconProps) {
  return <IconBase {...props}><path d="M12 3 5 6v5c0 4.6 2.75 8 7 10 4.25-2 7-5.4 7-10V6l-7-3Z" /><path d="M12 8v4M12 16h.01" /></IconBase>;
}

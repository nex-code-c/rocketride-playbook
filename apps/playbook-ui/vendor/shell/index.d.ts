import type { ComponentType, ReactNode } from "react";

export type ShellAppProps = Record<string, never>;

export interface AppDescriptor {
  id: string;
  name: string;
  branding?: { appName?: string };
  app: ComponentType<ShellAppProps>;
}

export interface AppLayoutProps {
  sidebar?: ReactNode;
  children?: ReactNode;
}

export declare const AppLayout: ComponentType<AppLayoutProps>;

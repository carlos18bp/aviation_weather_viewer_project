'use client';

import { Component, type ReactNode } from 'react';


export interface ViewerProductBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface ViewerProductBoundaryState {
  failed: boolean;
}

export class ViewerProductBoundary extends Component<
ViewerProductBoundaryProps,
ViewerProductBoundaryState
> {
  state: ViewerProductBoundaryState = { failed: false };

  static getDerivedStateFromError(): ViewerProductBoundaryState {
    return { failed: true };
  }

  render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

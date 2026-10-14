import { Component, ReactNode } from 'react';

interface Props {
  onError: () => void;
  children: ReactNode;
}

/** Jika adegan 3D gagal (mis. WebGL bermasalah), aplikasi tetap berjalan dengan cadangan. */
export default class SceneBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn('Adegan 3D tidak dapat dimuat, memakai tampilan cadangan.', error);
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

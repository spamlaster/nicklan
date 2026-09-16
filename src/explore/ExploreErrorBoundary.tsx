import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import "./ExploreLoading.css";

type Props = { children: ReactNode };
type State = { error: Error | null };

export default class ExploreErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Explore world crashed:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="explore-loading">
          <p>
            The 3D world couldn&rsquo;t load. <a href="#/">Back to the map</a>
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

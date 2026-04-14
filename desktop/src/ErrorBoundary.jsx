import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      const { fallback } = this.props;
      if (fallback) return fallback;
      return (
        <div style={{
          padding: 24, background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 4, margin: "16px 0",
        }}>
          <div style={{ color: "var(--red)", fontWeight: 700, marginBottom: 8 }}>Something went wrong</div>
          <div style={{ fontSize: "0.8rem", color: "var(--sub)", marginBottom: 12 }}>
            {this.state.error.message}
          </div>
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              background: "transparent", border: "1px solid var(--border)",
              color: "var(--sub)", borderRadius: 4, padding: "6px 16px",
              cursor: "pointer", fontSize: "0.8rem",
            }}>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

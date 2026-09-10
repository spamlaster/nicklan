export default function Header() {
  return (
    <header className="site-header">
      <a className="brand" href="#/">
        <span className="brand-icon">NL</span>

        <span>
          <strong>Nick Lancaster</strong>
          <small>Developer · Builder · Adventurer</small>
        </span>
      </a>

      <nav>
        <a href="#/">Start here</a>
        <a href="#/destinations/workshop">My work</a>
        <a className="contact-button" href="mailto:YOUR_EMAIL_ADDRESS">
          Say hello <span>→</span>
        </a>
      </nav>
    </header>
  );
}
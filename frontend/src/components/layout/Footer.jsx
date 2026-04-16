import React from 'react';

const Footer = ({ onNav }) => (
  <footer className="footer">
    <div className="footer-container">
      <div className="footer-copyright">© 2026 | 20210741 | W1953980</div>
      <div className="footer-links">
        <button className="footer-link-btn" onClick={() => onNav('privacy')}>Privacy</button>
        <button className="footer-link-btn" onClick={() => onNav('terms')}>Terms</button>
        <button className="footer-link-btn" onClick={() => onNav('support')}>Support</button>
      </div>
    </div>
  </footer>
);

export default Footer;
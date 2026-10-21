import { config } from './config.mjs';

const join = document.getElementById('join');
const links = document.getElementById('links');
const input = document.getElementById('email');
const feedback = document.getElementById('feedback');
const linksFeedback = document.getElementById('links-feedback');
const socialList = document.getElementById('social-links');

function showScreen() {
  const displayingLinks = location.hash === '#links';
  join.hidden = displayingLinks;
  links.hidden = !displayingLinks;
  document.title = displayingLinks
    ? 'Nova Studio — social links | VM5 Delivery Lab demo'
    : 'Nova Studio — mobile email opt-in demo | VM5 Delivery Lab';
  if (displayingLinks) {
    input.value = ''; // The demo never retains an entered email after navigation.
    feedback.textContent = '';
  } else {
    linksFeedback.textContent = '';
  }
}

function safeDestination(destination) {
  if (typeof destination !== 'string' || !destination) return '';
  try {
    const url = new URL(destination);
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

for (const social of config.socials) {
  const destination = safeDestination(social.destination);
  const item = document.createElement(destination ? 'a' : 'button');
  item.className = 'social';
  if (destination) {
    item.href = destination;
    item.target = '_blank';
    item.rel = 'noopener noreferrer';
  } else {
    item.type = 'button';
    item.addEventListener('click', () => {
      linksFeedback.textContent = social.label + ' is a placeholder in this portfolio demonstration. Client-approved destinations are configured for production.';
    });
  }
  const mark = document.createElement('span');
  mark.className = 'social-icon';
  mark.setAttribute('aria-hidden', 'true');
  mark.textContent = social.symbol;
  const body = document.createElement('span');
  body.className = 'social-body';
  const name = document.createElement('strong');
  name.textContent = social.label;
  const description = document.createElement('small');
  description.textContent = social.description;
  const arrow = document.createElement('span');
  arrow.className = 'social-arrow';
  arrow.setAttribute('aria-hidden', 'true');
  arrow.textContent = '↗';
  body.append(name, description);
  item.append(mark, body, arrow);
  socialList.append(item);
}

document.getElementById('optin-form').addEventListener('submit', (event) => {
  event.preventDefault();
  if (!input.checkValidity()) {
    input.reportValidity();
    return;
  }
  // Deliberately no email transmission, analytics, storage or external request.
  feedback.textContent = 'Preview confirmed. This demo did NOT subscribe you or store your address. A live project needs an approved email provider and double opt-in.';
  input.value = '';
});

window.addEventListener('hashchange', showScreen);
showScreen();

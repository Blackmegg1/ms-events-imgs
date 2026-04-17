export const GUEST_BIG_SCREEN_PATH = '/guestDashboard';
export const GUEST_DASHBOARD_PATH = GUEST_BIG_SCREEN_PATH;

export const GUEST_ACCESSIBLE_PATHS = [GUEST_BIG_SCREEN_PATH];

export const GUEST_HOME_ENTRY_PATHS = ['/', '/home'];

const parseRedirectUrl = (redirect: string | null) => {
  if (!redirect) {
    return null;
  }

  try {
    return new URL(redirect, window.location.origin);
  } catch (error) {
    return null;
  }
};

export const getSafeRedirectTarget = (redirect: string | null) => {
  const parsedRedirect = parseRedirectUrl(redirect);
  if (!parsedRedirect) {
    return '';
  }

  return `${parsedRedirect.pathname}${parsedRedirect.search}${parsedRedirect.hash}`;
};

export const canGuestAccessRedirect = (redirect: string | null) => {
  const parsedRedirect = parseRedirectUrl(redirect);
  if (!parsedRedirect) {
    return false;
  }

  return GUEST_ACCESSIBLE_PATHS.includes(parsedRedirect.pathname);
};

export const canNonGuestAccessRedirect = (redirect: string | null) => {
  const parsedRedirect = parseRedirectUrl(redirect);
  if (!parsedRedirect) {
    return false;
  }

  return !GUEST_ACCESSIBLE_PATHS.includes(parsedRedirect.pathname);
};

export const INSTALL_PROMPT_GLOBAL = '__aeroInstallPrompt';
export const INSTALL_PROMPT_EVENT = 'aero:install-prompt';
export const APP_INSTALLED_EVENT = 'aero:app-installed';

/**
 * Injected as the first child of <body> so the parser runs it ahead of every
 * Next bundle. Chromium can fire beforeinstallprompt before React is listening,
 * and the event has no replay API: missing it silently downgrades the install
 * button to manual instructions for the rest of the session.
 */
export const INSTALL_PROMPT_CAPTURE_SCRIPT = `(function(){
var w=window;
w.${INSTALL_PROMPT_GLOBAL}=w.${INSTALL_PROMPT_GLOBAL}||null;
w.addEventListener('beforeinstallprompt',function(e){
e.preventDefault();
w.${INSTALL_PROMPT_GLOBAL}=e;
w.dispatchEvent(new Event('${INSTALL_PROMPT_EVENT}'));
});
w.addEventListener('appinstalled',function(){
w.${INSTALL_PROMPT_GLOBAL}=null;
w.dispatchEvent(new Event('${APP_INSTALLED_EVENT}'));
});
})();`;

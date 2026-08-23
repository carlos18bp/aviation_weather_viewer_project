import type { InstallPlatform } from './installEnvironment';

export interface InstallGuide {
  lead: string;
  steps: readonly string[];
}

/**
 * What the user has to do right now, on the browser they are actually holding.
 * Copy is Spanish (tuteo, as the rest of the viewer); identifiers stay English.
 */
export function installGuideFor(platform: InstallPlatform, canPrompt: boolean): InstallGuide {
  if (canPrompt) {
    return {
      lead: 'Tu navegador puede instalarla directamente.',
      steps: [
        'Toca «Instalar ahora».',
        'Confirma en el aviso que muestra el navegador.',
        'La app queda en tu pantalla de inicio y se abre a pantalla completa.',
      ],
    };
  }

  switch (platform) {
    case 'ios-safari':
      return {
        lead: 'En iPhone y iPad se instala desde el menú Compartir de Safari.',
        steps: [
          'Toca el botón Compartir (el cuadro con la flecha hacia arriba).',
          'Desplázate y elige «Añadir a pantalla de inicio».',
          'Confirma con «Añadir».',
        ],
      };
    case 'ios-other':
      return {
        lead: 'Chrome, Firefox y Edge en iOS no pueden instalar aplicaciones web.',
        steps: [
          'Copia la dirección de esta página.',
          'Ábrela en Safari.',
          'Usa Compartir → «Añadir a pantalla de inicio».',
        ],
      };
    case 'in-app-webview':
      return {
        lead: 'Estás viendo la demo dentro de otra aplicación, y desde ahí no se puede instalar.',
        steps: [
          'Abre el menú de esta pantalla.',
          'Elige «Abrir en el navegador».',
          'Vuelve a tocar «Instalar app» desde Chrome o Safari.',
        ],
      };
    case 'firefox':
      return {
        lead: 'Firefox no permite instalar aplicaciones web.',
        steps: [
          'Abre esta misma dirección en Chrome, Edge o Safari.',
          'Vuelve a tocar «Instalar app».',
        ],
      };
    case 'safari':
      return {
        lead: 'En Safari de escritorio la app se agrega al Dock.',
        steps: [
          'Abre el menú «Archivo».',
          'Elige «Añadir al Dock…».',
          'Confirma con «Añadir».',
        ],
      };
    case 'chromium':
      return {
        lead: 'Tu navegador puede instalarla desde su propio menú.',
        steps: [
          'Busca el icono de instalar en la barra de direcciones.',
          'O abre el menú del navegador y elige «Instalar…».',
          'Confirma la instalación.',
        ],
      };
    default:
      return {
        lead: 'Puedes intentar instalarla desde el menú de tu navegador.',
        steps: [
          'Abre el menú del navegador.',
          'Busca «Instalar» o «Añadir a pantalla de inicio».',
          'Confirma la instalación.',
        ],
      };
  }
}

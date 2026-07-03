// App 100% de cliente: geolocalización y wake lock viven en el navegador,
// y sin SSR no hay que proteger cada acceso a `navigator`/`document`
export const ssr = false;

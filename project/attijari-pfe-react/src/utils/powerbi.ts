export function addPowerBiEmbedParams(url?: string, pageName?: string) {
  if (!url?.trim()) {
    return undefined;
  }

  try {
    const parsedUrl = new URL(url);

    parsedUrl.searchParams.set('filterPaneEnabled', 'false');
    parsedUrl.searchParams.set('navContentPaneEnabled', 'false');

    if (pageName) {
      parsedUrl.searchParams.set('pageName', pageName);
    }

    return parsedUrl.toString();
  } catch {
    const separator = url.includes('?') ? '&' : '?';
    const searchParams = new URLSearchParams({
      filterPaneEnabled: 'false',
      navContentPaneEnabled: 'false',
    });

    if (pageName) {
      searchParams.set('pageName', pageName);
    }

    return `${url}${separator}${searchParams.toString()}`;
  }
}

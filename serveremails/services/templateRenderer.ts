/**
 * Injecte dynamiquement des données dans un template HTML ou texte.
 * Utilise le format {{variable}} dans le template.
 *
 * @param template - Contenu HTML ou texte brut du template
 * @param data - Objet contenant les paires clé/valeur à injecter
 * @returns Template rendu avec les valeurs injectées
 */
export const renderTemplate = (
  template: string,
  data: Record<string, string>
): string => {
  let rendered = template;

  for (const key in data) {
    const placeholder = `{{${key}}}`;
    rendered = rendered.split(placeholder).join(data[key]);
  }

  return rendered;
};

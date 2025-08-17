"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderTemplate = void 0;
/**
 * Injecte dynamiquement des données dans un template HTML ou texte.
 * Utilise le format {{variable}} dans le template.
 *
 * @param template - Contenu HTML ou texte brut du template
 * @param data - Objet contenant les paires clé/valeur à injecter
 * @returns Template rendu avec les valeurs injectées
 */
var renderTemplate = function (template, data) {
    var rendered = template;
    for (var key in data) {
        var placeholder = "{{".concat(key, "}}");
        rendered = rendered.split(placeholder).join(data[key]);
    }
    return rendered;
};
exports.renderTemplate = renderTemplate;

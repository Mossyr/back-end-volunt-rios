// utils/date.utils.js

/**
 * Formata uma data para um formato longo e amigável.
 * Exemplo: "terça-feira, 14 de outubro"
 * @param {Date | string} data - A data a ser formatada.
 * @returns {string} A data formatada.
 */
exports.formatarDataAmigavel = (data) => {
    return new Date(data).toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone: 'UTC'
    });
};

/**
 * Formata uma data para um formato curto numérico.
 * Exemplo: "14/10"
 * @param {Date | string} data - A data a ser formatada.
 * @returns {string} A data formatada.
 */
exports.formatarDataCurta = (data) => {
    return new Date(data).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        timeZone: 'UTC'
    });
};
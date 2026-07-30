(function exposeProgramSearch(root, createSearch) {
  "use strict";

  const search = createSearch();
  root.EasyRadioProgramSearch = search;

  if (typeof module === "object" && module.exports) {
    module.exports = search;
  }
})(
  typeof globalThis === "object" ? globalThis : window,
  function createProgramSearch() {
    "use strict";

    function normalizeText(value) {
      if (value === null || value === undefined) {
        return "";
      }

      return String(value).trim().toLocaleLowerCase();
    }

    function normalizeList(value) {
      if (Array.isArray(value)) {
        return value;
      }

      return value === null || value === undefined || value === ""
        ? []
        : [value];
    }

    function getSearchText(program) {
      if (!program || typeof program !== "object") {
        return "";
      }

      return [
        program.title,
        program.stationName,
        ...normalizeList(program.hosts),
        ...normalizeList(program.keywords),
        program.description,
        program.scheduleText
      ]
        .map(normalizeText)
        .join(" ");
    }

    function filterPrograms(programs, query) {
      const source = Array.isArray(programs) ? programs : [];
      const normalizedQuery = normalizeText(query);

      if (!normalizedQuery) {
        return source.slice();
      }

      return source.filter((program) =>
        getSearchText(program).includes(normalizedQuery)
      );
    }

    return Object.freeze({ filterPrograms });
  }
);

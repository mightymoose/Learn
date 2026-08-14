/* search-filter.js — the matching logic behind the index page.
   Kept out of index.html so it can be tested in node without a DOM.
   See tools/test-search.js. */

(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (typeof window !== "undefined") {
    window.filterEntries = api.filterEntries;
    window.groupBySubject = api.groupBySubject;
  }
})(this, function () {
  "use strict";

  // Every field a query term is allowed to match.
  function haystack(entry) {
    return [
      entry.title,
      entry.subject,
      entry.section,
      entry.source,
      entry.summary,
      entry.kicker,
      entry.type,
      (entry.tags || []).join(" "),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
  }

  /* Filter by free-text query and a type. All query terms must match
     (AND), each as a case-insensitive substring of any indexed field. */
  function filterEntries(entries, query, type) {
    var list = entries || [];

    if (type && type !== "all") {
      list = list.filter(function (e) {
        return e.type === type;
      });
    }

    var terms = String(query || "")
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    if (terms.length === 0) return list.slice();

    return list.filter(function (e) {
      var hay = haystack(e);
      return terms.every(function (t) {
        return hay.indexOf(t) !== -1;
      });
    });
  }

  /* Group into [{subject, items}], preserving the index's existing order. */
  function groupBySubject(entries) {
    var order = [];
    var bucket = {};
    (entries || []).forEach(function (e) {
      var k = e.subject || "Other";
      if (!bucket[k]) {
        bucket[k] = [];
        order.push(k);
      }
      bucket[k].push(e);
    });
    return order.map(function (k) {
      return { subject: k, items: bucket[k] };
    });
  }

  return { filterEntries: filterEntries, groupBySubject: groupBySubject };
});

import { extend, isEmpty, keyBy } from 'lodash';
import { getObjectFromObjectList } from '../helpers.jsx';

export class CustomESRequestSerializer {
  constructor(config) {
    this.reviewstatemapping = config.reviewstatemapping;
    this.searchedFields = config.searchedFields;
    this.facet_fields = getObjectFromObjectList(config.facet_fields);
    this.allowed_content_types = config.allowed_content_types;
    this.allowed_review_states = config.allowed_review_states;
    this.search_sections = config.search_sections;
    this.analyzer = config.analyzer;
  }
  /**
   * Convert Array of filters to Object of filters
   * @param  {Array}  filters Array of filters
   * @return {Object}         Object of filters
   * input: [
   *   [ 'type_agg', 'value1' ]
   *   [ 'type_agg', 'value2', [ 'subtype_agg', 'a value' ] ]
   * ]
   * output: {
   *   type_agg: ['value1', 'value2']
   *   subtype_agg: [ 'a value' ]
   * }
   */
  getFilters = (filters) => {
    const aggValueObj = {};

    const getChildFilter = (filter) => {
      const aggName = filter[0];
      const fieldValue = filter[1];
      if (aggName in aggValueObj) {
        aggValueObj[aggName].push(fieldValue);
      } else {
        aggValueObj[aggName] = [fieldValue];
      }
      const hasChild = filter.length === 3;
      if (hasChild) {
        getChildFilter(filter[2]);
      }
    };

    filters.forEach((filterObj) => {
      getChildFilter(filterObj);
    });
    return aggValueObj;
  };

  /**
   * Return a serialized version of the app state `query` for the API backend.
   * @param {object} stateQuery the `query` state to serialize
   */
  serialize = (stateQuery) => {
    const { queryString, sortBy, sortOrder, page, size, filters } = stateQuery;
    const bodyParams = {};
    const force_fuzzy = true;

    if (!isEmpty(queryString)) {
      // Construction of query
      // this needs some more flexibility
      bodyParams['query'] = {
        multi_match: {
          query: queryString,
          fields: this.searchedFields,
          analyzer: this.analyzer,
          operator: 'or',
          fuzziness: force_fuzzy ? 'AUTO' : 0,
          prefix_length: 2,
          type: 'most_fields',
          minimum_should_match: '75%',
        },
      };

      bodyParams['highlight'] = {
        number_of_fragments: 20,
        fields: [],
      };
    }

    if (sortBy !== 'bestmatch') {
      bodyParams['sort'] = bodyParams['sort'] || [];
      const sortObj = {};
      sortObj[sortBy] = sortOrder && sortOrder === 'desc' ? 'desc' : 'asc';
      bodyParams['sort'].push(sortObj);
    }

    if (size > 0) {
      bodyParams['size'] = size; // batch size
    }

    if (page > 0) {
      const s = size > 0 ? size : 0;
      const from = (page - 1) * s;
      bodyParams['from'] = from;
    }

    const getFieldnameFromAgg = (agg) => {
      return agg.replace('_agg', '');
    };

    // Generate terms of global filters
    let terms = [];
    terms.push({
      terms: {
        portal_type: this.allowed_content_types,
      },
    });
    terms.push({
      terms: {
        review_state: this.allowed_review_states,
      },
    });

    const filters_dict = keyBy(filters, (e) => {
      return e[0];
    });
    const section = filters_dict['section'];

    // Generate terms of selected options
    let terms_of_selected_options = [];
    if (filters.length) {
      // Convert to object.
      const aggValueObj = this.getFilters(filters);

      terms_of_selected_options = Object.keys(aggValueObj).reduce(
        (accumulator, aggName) => {
          const obj = {};
          const fieldName = getFieldnameFromAgg(aggName);
          if (fieldName === 'subjects') {
            obj['subjects.keyword'] = aggValueObj[aggName];
          } else {
            obj[fieldName] = aggValueObj[aggName];
          }
          if (
            aggName !== 'section' ||
            JSON.stringify(aggValueObj[aggName]) !== '["others"]'
          ) {
            accumulator.push({ terms: obj });
          }
          return accumulator;
        },
        [],
      );
    }

    /**
     * post_filter
     * to show all options in aggregations, not the possible ones based on the current search
     * but filter search results based on selected filters
     */

    const post_filter = {
      bool: { must: terms.concat(terms_of_selected_options) },
    };

    // Exclude sections
    if (section && section[1] === 'others') {
      post_filter['bool']['must_not'] = [
        {
          terms: {
            section: this.search_sections.items.map((el) => {
              return el.section;
            }),
          },
        },
      ];
    }

    bodyParams['post_filter'] = post_filter;

    /**
     * Aggregations
     */
    const filter = (fieldName) => {
      let myAggsFilter = terms;
      // Add selected filters
      const terms_of_selected_options_without_self =
        terms_of_selected_options.filter(
          (el) => !Object.keys(el.terms).includes(fieldName),
        );
      myAggsFilter = myAggsFilter.concat(
        terms_of_selected_options_without_self,
      );

      // So far
      let res = myAggsFilter
        ? {
            bool: {
              must: myAggsFilter,
            },
          }
        : null;

      if (fieldName !== 'section') {
        if (section) {
          if (section[1] === 'others') {
            res = res || {
              bool: {},
            };
            res.bool.must_not = [
              {
                terms: {
                  section: this.search_sections.items.map((el) => {
                    return el.section;
                  }),
                },
              },
            ];
          } else {
            // // Must section
            // res = res || {
            //   bool: {
            //     must: [],
            //   },
            // };
            // res.bool.must.push([section[1]]);
          }
        }
      }

      return res;
    };

    bodyParams['aggs'] = {};
    let aggregations = Object.keys(this.facet_fields);
    aggregations.push('section');
    aggregations.forEach((fieldName) => {
      let aggName = `${fieldName}_agg`;
      let field = fieldName;
      // XXX Special case for speciic fields are unfortunately hardcoded, should be more flexible
      if (fieldName === 'Subject') {
        field = 'subjects.keyword';
        aggName = 'subjects_agg';
      }
      if (fieldName === 'section') {
        field = 'section.keyword';
      }
      let aggBucketTermsComponent = {
        [aggName]: {
          aggs: {
            [aggName]: {
              terms: {
                field: `${field}`,
                order: {
                  _key: 'asc',
                },
                size: 500, // number of buckets
              },
            },
            somemoredatafromelasticsearch: {
              top_hits: {
                size: 1,
                _source: { includes: [field] },
              },
            },
          },
        },
      };
      const filter_fieldname = filter(fieldName);
      if (filter_fieldname) {
        aggBucketTermsComponent[aggName].filter = filter_fieldname;
      }
      extend(bodyParams['aggs'], aggBucketTermsComponent);
    });

    return bodyParams;
  };
}

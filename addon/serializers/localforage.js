import Ember from 'ember';
import DS from 'ember-data';

export default DS.JSONSerializer.extend({

  serializeHasMany: function(snapshot, json, relationship) {
    var key = relationship.key;

    if (this._shouldSerializeHasMany(snapshot, key, relationship)) {
      var payloadKey;

      // if provided, use the mapping provided by `attrs` in
      // the serializer
      payloadKey = this._getMappedKey(key);
      if (payloadKey === key && this.keyForRelationship) {
        payloadKey = this.keyForRelationship(key, "hasMany", "serialize");
      }
      json[payloadKey] = snapshot.hasMany(key, { ids: true });
      // TODO support for polymorphic manyToNone and manyToMany relationships
    }
  },

  /**
   * Extracts whatever was returned from the adapter.
   *
   * If the adapter returns relationships in an embedded way, such as follows:
   *
   * ```js
   * {
   *   "id": 1,
   *   "title": "Rails Rambo",
   *
   *   "_embedded": {
   *     "comment": [{
   *       "id": 1,
   *       "comment_title": "FIRST"
   *     }, {
   *       "id": 2,
   *       "comment_title": "Rails is unagi"
   *     }]
   *   }
   * }
   *
   * this method will create separated JSON for each resource and then push
   * them individually to the Store.
   *
   * In the end, only the main resource will remain, containing the ids of its
   * relationships. Given the relations are already in the Store, we will
   * return a JSON with the main resource alone. The Store will sort out the
   * associations by itself.
   *
   * @method extractSingle
   * @private
   * @param {DS.Store} store the returned store
   * @param {DS.Model} type the type/model
   * @param {Object} payload returned JSON
   */
  extractSingle: function(store, type, payload) {
    if (payload && payload._embedded) {
      for (var relation in payload._embedded) {
        var relType = type.typeForRelationship(relation);
        var typeName = relType.typeKey,
            embeddedPayload = payload._embedded[relation];

        if (embeddedPayload) {
          if (Ember.isArray(embeddedPayload)) {
            store.pushMany(typeName, embeddedPayload);
          } else {
            store.push(typeName, embeddedPayload);
          }
        }
      }

      delete payload._embedded;
    }

    return this.normalize(type, payload);
  },

  /**
   * This is exactly the same as extractSingle, but used in an array.
   *
   * @method extractSingle
   * @private
   * @param {DS.Store} store the returned store
   * @param {DS.Model} type the type/model
   * @param {Array} payload returned JSONs
   */
  extractArray: function(store, type, payload) {
    var serializer = this;

    return payload.map(function(record) {
      return serializer.extractSingle(store, type, record);
    });
  }

});

/**
 * User: Chris Johnson
 * Date: 10/3/13
 */
/// <reference path="../references.ts"/>

module Ground {

  export interface Query_Request {
    trellis:string;
    filters?:Query_Filter[]
    sorts?:Query_Sort[]
    expansions?:string[]
    reductions?:string[]
  }

  export interface Update_Request{
    objects:any[];
  }

  export class Irrigation {
    ground:Core;

    constructor(ground:Core) {
      this.ground = ground;
    }

    query(request:Query_Request):Promise {
      var i, trellis = this.ground.sanitize_trellis_argument(request.trellis);
      var query = new Query(trellis);

      if (request.filters) {
        for ( i = 0; i < request.filters.length; ++i) {
          var filter = request.filters[i]
          query.add_property_filter(filter.property, filter.value, filter.operator)
        }
      }

      if (request.sorts) {
        for ( i = 0; i < request.sorts.length; ++i) {
          query.add_sort(request.sorts[i])
        }
      }

      if (request.expansions) {
        for ( i = 0; i < request.expansions.length; ++i) {
          query.expansions.push(request.expansions[i])
        }
      }

      return query.run();
    }

    update(request:Update_Request, uid = null):Promise {
      var promises:Promise[] = [];

      if (!request.objects)
        throw new Error('Request requires an objects array.');

      for (var i = 0; i < request.objects.length; ++i) {
        var object = request.objects[i];
        var promise = this.ground.update_object(object.trellis, object, uid);
        promises.push(promise);
      }

      return when.all(promises)
    }
  }
}
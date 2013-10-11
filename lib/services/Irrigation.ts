/**
 * User: Chris Johnson
 * Date: 10/3/13
 */
/// <reference path="../references.ts"/>

module Ground {

  export interface Query_Request {
    trellis:string;
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
      var trellis = this.ground.sanitize_trellis_argument(request.trellis);
      var query = new Query(trellis);

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
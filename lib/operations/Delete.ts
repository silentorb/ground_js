/**
 * User: Chris Johnson
 * Date: 9/25/13
 */
/// <reference path="../references.ts"/>

module Ground {
  export class Delete implements IUpdate {

    trellis:Trellis
    seed:ISeed

    constructor(trellis:Trellis, seed:ISeed) {
      this.trellis = trellis
      this.seed = seed
    }

    get_access_name():string {
      return this.trellis + '.delete'
    }

    run():Promise {
      throw new Error('Not implemented yet.')
    }
  }
}
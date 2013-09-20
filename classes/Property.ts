/**
 * Created with JetBrains PhpStorm.
 * User: Chris Johnson
 * Date: 9/18/13
 * Time: 5:40 PM
 */
  /// <reference path="references.ts"/>

module Ground_JS{
  export class Property {
    public name:string;
    public parent:Trellis;
    public type:string;
    public link_class;
    public is_readonly:boolean = false;
    public insert:string;
    public property:string;
    public default;
    public is_private:boolean = false;
    public is_virtual:boolean = false;

    constructor(name:string, source, trellis) {
      MetaHub.extend(this, source);

      this.name = name;
      this.parent = trellis;
    }

  }
}
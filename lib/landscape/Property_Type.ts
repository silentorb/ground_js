
module landscape {

  export class Property_Type {
    name:string;
    property_class;
    field_type;
    default_value;
    parent:Property_Type;
    //db:Database;
    allow_null:boolean = false

    constructor(name:string, info, types:Property_Type[]) {
      if (info.parent) {
        var parent = types[info.parent];
        MetaHub.extend(this, parent);
        this.parent = parent;
      }

      this.field_type = info.field_type || null;

      this.name = name
      this.property_class = 'Property'
      if (info.default !== undefined)
        this.default_value = info.default

      if (info.allow_null !== undefined)
        this.allow_null = info.allow_null
    }

    get_field_type() {
      if (this.field_type) {
        return this.field_type;
      }

      if (this.parent) {
        return this.parent.get_field_type();
      }

      throw new Error(this.name + " could not find valid field type.");
    }
  }
}
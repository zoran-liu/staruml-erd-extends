const comment = {
    'default': "",
    'kind': "prim",
    'name': "comment",
    'type': "String",
    'visible': true
}
const label = {
    'default': "",
    'kind': "prim",
    'name': "label",
    'type': "String",
    'visible': true
}
const label2comment = {
    'default': true,
    'kind': "prim",
    'name': "label2comment",
    'type': "Boolean",
    'visible': true
}
const defaultValue = {
    'default': "",
    'kind': "prim",
    'name': "defaultValue",
    'type': "String",
    'visible': true
}

function buildERDEntityView() {

    const ERDEntityViewType = type.ERDEntityView;

    class ERDEntityView extends ERDEntityViewType {

        constructor() {
            super()
            this.removeSubView(this.columnCompartment)
            this.columnCompartment = new type.ERDColumnCompartmentView()
            this.columnCompartment.parentStyle = true
            this.addSubView(this.columnCompartment)
        }

        update(canvas) {
            let modelName = null;
            if (this.model) {
                modelName = this.model.name;
                this.model.name = modelName + (this.model.label ? `(${this.model.label})` : "")
            }
            super.update(canvas)
            if (this.model) {
                this.model.name = modelName
            }
        }
    }

    const ERDColumnCompartmentViewType = type.ERDColumnCompartmentView;

    class ERDColumnCompartmentView extends ERDColumnCompartmentViewType {

        constructor() {
            super()
        }

        update(canvas) {
            if (this.model.columns) {
                let map = {}
                for (let i = 0, len = this.subViews; i < len; i++) {
                    map[this.subViews[i].model] = this.subViews[i];
                }
                for (let i = 0, len = this.model.columns.length; i < len; i++) {
                    let column = this.model.columns[i]
                    let columnView = map[column]
                    if (!columnView) {
                        columnView = new type.ERDColumnView()
                        columnView.model = column
                        columnView._parent = this
                        app.repository.bypassInsert(this, 'subViews', columnView)
                    }
                }
            }
            super.update(canvas)
        }
    }

    const ERDColumnType = type.ERDColumn

    class ERDColumn extends ERDColumnType {

        constructor() {
            super()
            this.label = ''
            this.comment = ''
            this.label2comment = true
            this.nullable = true
            this.defaultValue = ''
        }

        getKeyString() {
            let _key = this.primaryKey ? "PK," : ""
            if (this.foreignKey) {
                _key += "FK,"
            }
            if (!this.primaryKey && !this.nullable) {
                _key += "NN,"
            }
            if (!this.primaryKey && this.unique) {
                _key += "U,"
            }
            if (_key.length > 0) {
                _key = _key.substring(0, _key.length - 1)
            }
            return _key
        }

        getNameString() {
            return this.name + (this.label ? `(${this.label})` : "")
        }

        get textualNotation() {
            let str = ''
            if (this.primaryKey) {
                str += "PK: "
            }
            if (this.unique) {
                str += "UK: "
            }
            if (this.foreignKey) {
                str += "FK: "
            }
            if (this.nullable) {
                str += "NU: "
            } else {
                str += "NN: "
            }
            str += this.name
            if (this.type && this.type.length > 0) {
                str = str + ": " + this.type
                if (this.length) {
                    str = str + '(' + this.length + ')'
                }
            }
            if (this.label && this.label.length > 0) {
                str = str + "@ " + this.label
            }
            if (this.defaultValue && this.defaultValue.length > 0) {
                str = str + " => " + this.defaultValue
            }
            return str
        }
    }

    const ERDEntityType = type.ERDEntity;

    class ERDEntity extends ERDEntityType {

        constructor() {
            super()
            this.label = ''
            this.comment = ''
        }

        get textualNotation() {
            let str = this.name
            if (this.label && this.label.length > 0) {
                str = str + "@ " + this.label
            }
            return str
        }
    }

    return {ERDEntityView, ERDColumnCompartmentView, ERDColumn, ERDEntity}
}


function addColumnField() {
    if (global.meta.ERDColumn) {
        global.meta.ERDColumn.attributes = [label, ...global.meta.ERDColumn.attributes, comment, defaultValue]
    } else {
        setTimeout(addField, 0)
    }
}

function addEntityField() {
    if (global.meta.ERDEntity) {
        global.meta.ERDEntity.attributes = [label, ...global.meta.ERDEntity.attributes, comment, label2comment]
    } else {
        setTimeout(addEntityField, 0)
    }
}

function addEitityView() {
    if (type.ERDEntityView) {
        let view = buildERDEntityView()
        type.ERDEntityView = view.ERDEntityView
        type.ERDColumnCompartmentView = view.ERDColumnCompartmentView
        type.ERDColumn = view.ERDColumn
        type.ERDEntity = view.ERDEntity
    } else {
        setTimeout(addEitityView, 0)
    }
}

function addColumnCommand() {
    if (app.commands.commands["erd:set-column-expression"]) {
        let command = app.commands.commands["erd:set-column-expression"]
        app.commands.commands["erd:set-column-expression"] = (p) => {
            let hasPrefix = true
            do {
                if (p.value.startsWith("PK:")) {
                    p.model.primaryKey = true
                    p.model.nullable = false
                    p.value = p.value.substring(3).trim()
                } else if (p.value.startsWith("UK:")) {
                    p.model.unique = true
                    p.value = p.value.substring(3).trim()
                } else if (p.value.startsWith("FK:")) {
                    p.model.foreignKey = true
                    p.value = p.value.substring(3).trim()
                } else if (p.value.startsWith("NN:")) {
                    p.model.nullable = false
                    p.value = p.value.substring(3).trim()
                } else if (!p.model.primaryKey && p.value.startsWith("NU:")) {
                    p.model.nullable = true
                    p.value = p.value.substring(3).trim()
                } else {
                    hasPrefix = false
                }
            } while (hasPrefix)
            let index = p.value.indexOf("=>")
            if (index >= 0) {
                var defaultValue = p.value.substring(index + 2)
                p.value = p.value.substring(0, index)
                p.model.defaultValue = defaultValue.trim()
            }
            index = p.value.indexOf("@")
            if (index >= 0) {
                var label = p.value.substring(index + 1)
                p.value = p.value.substring(0, index)
                p.model.label = label.trim()
                if (!p.model.comment || p.model._parent.label2comment) {
                    p.model.comment = p.model.label
                }
            }
            return command(p)
        }
    } else {
        setTimeout(addColumnCommand, 0)
    }
}

function addEntityCommand() {
    if (app.commands.commands["erd:set-column-expression"]) {
        app.commands.commands["erd:set-entity-expression"] = (p) => {
            let index = p.value.indexOf("@")
            let fields = {}
            if (index >= 0) {
                var label = p.value.substring(index + 1)
                p.value = p.value.substring(0, index)
                fields.label = label.trim()
                if (p.model.label2comment || !p.model.comment) {
                    fields.comment = fields.label
                }
            }
            fields.name = p.value
            let elem = p.model
            app.engine.setProperties(elem, fields)
        }
    } else {
        setTimeout(addEntityCommand, 0)
    }
}

function addEntityQuickEdit() {
    if (app.quickedits.quickedits) {
        let entity = null;
        for (let i = 0; i < app.quickedits.quickedits.length; i++) {
            if ("erd.entity" == app.quickedits.quickedits[i].id) {
                entity = app.quickedits.quickedits[i]
                break;
            }
        }
        if (!entity) {
            setTimeout(addEntityQuickEdit, 0)
        }
        let component = null;
        for (let i = 0; i < entity.components.length; i++) {
            if ("erd.set-name" == entity.components[i].id) {
                component = entity.components[i]
                break;
            }
        }
        if (!component) {
            setTimeout(addEntityQuickEdit, 0)
        }
        component.command = "erd:set-entity-expression"
        component.property = "textualNotation"
    } else {
        setTimeout(addEntityQuickEdit, 0)
    }
}

function init() {
    addColumnField();
    addEntityField();
    addEitityView();
    addColumnCommand();
    addEntityCommand();
    addEntityQuickEdit();
}

exports.init = init

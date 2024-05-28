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

function buildERDEntityView() {

    let ERDEntityViewType = type.ERDEntityView;

    class ERDEntityView extends ERDEntityViewType {

        constructor() {
            super()
            this.removeSubView(this.columnCompartment)
            this.columnCompartment = new type.ERDColumnCompartmentView()
            this.columnCompartment.parentStyle = true
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

    let ERDColumnCompartmentViewType = type.ERDColumnCompartmentView;

    /**
     * ERDColumnCompartmentView
     */
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
                        // Insert columnView to subViews by bypass command.
                        app.repository.bypassInsert(this, 'subViews', columnView)
                    }
                }
            }
            super.update(canvas)
        }
    }

    let ERDColumnTyp = type.ERDColumn

    /**
     * ERDColumn
     */
    class ERDColumn extends ERDColumnTyp {

        constructor() {
            super()
            this.label = ''
            this.comment = ''
        }

        getNameString() {
            return this.name + (this.label ? `(${this.label})` : "")
        }
    }

    let ERDEntityType = type.ERDEntity;

    /**
     * ERDEntity
     */
    class ERDEntity extends ERDEntityType {

        constructor() {
            super()
            this.label = ''
            this.comment = ''
        }
    }

    return {ERDEntityView, ERDColumnCompartmentView, ERDColumn, ERDEntity}
}


function addColumnField() {
    if (global.meta.ERDColumn) {
        global.meta.ERDColumn.attributes = [label, ...global.meta.ERDColumn.attributes, comment]
    } else {
        setTimeout(addField, 0)
    }
}

function addEitityField() {
    if (global.meta.ERDEntity) {
        global.meta.ERDEntity.attributes = [label, ...global.meta.ERDEntity.attributes, comment]
    } else {
        setTimeout(addEitityField, 0)
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


function init() {
    addColumnField();
    addEitityField();
    addEitityView();
}

exports.init = init

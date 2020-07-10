import { Dataset2D } from './dataset_2d'
import { LabeledPoint } from './labeled_point'
import { Label2DStyle } from '../styles/label_style'
import { StandardLabelFunction } from './gridlines'

class InteractiveDataset2DInspectionPoint extends LabeledPoint {
  constructor(params) {
    super(params)
  }
}

class InteractiveDataset2D extends InteractiveElement {
  constructor(params={}) {
    super(params)

    this.labelStyle = new Label2DStyle()
    this.labelFunction = (x, y, index) => {
      return `(${StandardLabelFunction(x)}, ${StandardLabelFunction(y)})`
    }

    this.inspectedPointIndices = []
    this.inspections = []
  }

  removeInspections() {
    this.inspections
  }
}

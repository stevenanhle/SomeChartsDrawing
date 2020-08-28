import { Component,ViewChild, ElementRef} from '@angular/core';
import { ApiService } from './services/api-services';
import * as go from 'gojs';
import {webSocket, WebSocketSubject} from 'rxjs/webSocket';
import { Chart } from 'chart.js';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'interviewTest';
  @ViewChild('myDiagramDiv') element: ElementRef;
  @ViewChild('barCanvas') barCanvas;
  @ViewChild('webSocketCanvasCPU') webSocketCanvasCPU;
  @ViewChild('webSocketCanvasMemory') webSocketCanvasMemory;
  @ViewChild('webSocketCanvasMotor') webSocketCanvasMotor;

  $ = go.GraphObject.make;
  myDiagram: go.Diagram;
  myWebSocket = webSocket('ws://35.183.23.210:8000/b');

  
  groupedColumnsName = [];
  ns_column = [];
  nrl_column = [];
  nlr_column = [];

  socketData = null;
  cpu_First = [];
  cpu_Second = [];
  memory_Total = [];
  memory_Available = [];
  motor_rpm = [];
  motor_output = [];
  realTimeLine = [];

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    
  }

  session2GetData(){
    this.apiService.get('https://api.bluecitytechnology.com/s/smp/').subscribe(response=>{
       let data = response['data'];
       if(data){
        this.section2_getGroupColumnsName(data,10);
        let datasets = [
          {
              label: "NS",
              backgroundColor: "#20B2AA",
              data:  this.ns_column
          },
          {
              label: "NRL",
              backgroundColor: "#DB7093",
              data: this.nrl_column
          },
          {
              label: "NLR",
              backgroundColor: "#2E8B57",
              data: this.nlr_column
          }
        ]
        this.drawingBarChar(this.groupedColumnsName,datasets);
       }
    })
  }

  section2_getGroupColumnsName(data,dayCount){
    let count = 0;
    for (let key in data) {
      if(count < dayCount)
      {
        let value = data[key];
        if(key && value && typeof value ==='object'){
          this.groupedColumnsName.push(key);
          this.section2_getSingleColumnValue(value);
        }
      }
      count++;
    }
  }

  section2_getSingleColumnValue(obj){
    for (let k in obj) {
      let val = obj[k];
      if(k && val){
        if(k == 'ns')
        {
            if(val) this.ns_column.push(val);
            else this.ns_column.push(0);
        }
        if(k == 'nrl')
        {
          if(val) this.nrl_column.push(val);
          else this.nrl_column.push(0);
        }
        if(k == 'nlr')
        {
          if(val) this.nlr_column.push(val);
          else this.nlr_column.push(0);
        }
      }
    }
  }

  drawingBarChar(lables,datasets) {
    // console.log(lables);
    let data = {
      labels: lables, //["Chocolate", "Vanilla", "Strawberry"],
      datasets: datasets
    }
    new Chart(this.barCanvas.nativeElement, {
      type: 'bar',
      data: data,
      options: {
        scales: {
          yAxes: [{
            ticks: {
              beginAtZero: true
            }
          }]
        }
      }
    });
  }

  section3_createData(data){
    console.log(data);
    let date = new Date();
    let short_time = date.toLocaleTimeString();  // -> "7:38:05 AM"
    this.realTimeLine.push(short_time);
    let lidar = data['lidar'];
    if(lidar){
      if(lidar['memory']){
        let total = (lidar['memory']['total']) ? lidar['memory']['total'] : 0;
        this.memory_Total.push(total);
        let avail = (lidar['memory']['available']) ? lidar['memory']['available'] : 0;
        this.memory_Available.push(avail);
      }
      if(lidar['cpu']){
        let cpu1 = (lidar['cpu']['1']) ? lidar['cpu']['1'] : 0;
        this.cpu_First.push(cpu1);
        let cpu2 = (lidar['cpu']['2']) ? lidar['cpu']['2'] : 0;
        this.cpu_Second.push(cpu2);
      }
    }
    let sensor = data['sensor'];
    if(sensor){
      if(sensor['motor_rpm']){
        let rpm = (sensor['motor_rpm']) ? sensor['motor_rpm'] : 0;
        this.motor_rpm.push(rpm);
        let output = (sensor['output']) ? sensor['output'] : 0;
        this.motor_output.push(output);
      }
    }
  }

  section3_drawingLineGraph(){
    new Chart(this.webSocketCanvasCPU.nativeElement, {
      type: 'line',
      data: {
        labels: this.realTimeLine,
        datasets: [{ 
            data: this.cpu_First,
            label: "First CPU",
            borderColor: "#3e95cd",
            fill: false
          }, { 
            data: this.cpu_Second,
            label: "Second CPU",
            borderColor: "#8e5ea2",
            fill: false
          }
        ]
      },
      options: {
        title: {
          display: true,
          text: 'Collected Information'
        }
      }
    });
    new Chart(this.webSocketCanvasMemory.nativeElement, {
      type: 'line',
      data: {
        labels: this.realTimeLine,
        datasets: [{ 
            data: this.memory_Total,
            label: "Total Memory",
            borderColor: "#FF7F50",
            fill: false
          }, { 
            data: this.memory_Available,
            label: "Available Memory",
            borderColor: "#e8c3b9",
            fill: false
          }
        ]
      },
      options: {
        title: {
          display: true,
          text: 'Collected Information'
        }
      }
    });

    new Chart(this.webSocketCanvasMotor.nativeElement, {
      type: 'line',
      data: {
        labels: this.realTimeLine,
        datasets: [{
            data: this.motor_rpm,
            label: "Motor_rpm",
            borderColor: "#c45850",
            fill: false
          },
          { 
            data: this.motor_output,
            label: "Ouput",
            borderColor: "#3cba9f",
            fill: false
          }
        ]
      },
      options: {
        title: {
          display: true,
          text: 'Collected Information'
        }
      }
    });
  }

  ngAfterViewInit() {
    this.session2GetData();

    this.myWebSocket.asObservable().subscribe(dataFromServer => {
      this.socketData = dataFromServer;
      if(this.realTimeLine.length==0){
        this.section3_createData(this.socketData);
        this.section3_drawingLineGraph();
      }
    });

    setInterval((s)=>{
      this.section3_createData(this.socketData);
      this.section3_drawingLineGraph();
    }, 30000);

    this.drawingTree();
  }

  drawingTree(){
    this.myDiagram =this.$(go.Diagram, this.element.nativeElement,
      {
        // when the user drags a node, also move/copy/delete the whole subtree starting with that node
        "commandHandler.copiesTree": true,
        "commandHandler.copiesParentKey": true,
        "commandHandler.deletesTree": true,
        "draggingTool.dragsTree": true,
        "undoManager.isEnabled": true
      }
    );

    // a node consists of some text with a line shape underneath
    this.myDiagram.nodeTemplate =
        this.$(go.Node, "Vertical",
          { selectionObjectName: "TEXT" },

        this.$(go.TextBlock,
          {
            name: "TEXT",
            minSize: new go.Size(30, 15),
            editable: true
          },
          // remember not only the text string but the scale and the font in the node data
          new go.Binding("text", "text").makeTwoWay(),
          new go.Binding("scale", "scale").makeTwoWay(),
          new go.Binding("font", "font").makeTwoWay()),

        this.$(go.Shape, "LineH",
          {
            stretch: go.GraphObject.Horizontal,
            strokeWidth: 3, height: 3,
            // this line shape is the port -- what links connect with
            portId: "", fromSpot: go.Spot.LeftRightSides, toSpot: go.Spot.LeftRightSides
          },
        new go.Binding("stroke", "brush"),
        // make sure links come in from the proper direction and go out appropriately
        new go.Binding("fromSpot", "dir", function(d) { return this.spotConverter(d, true); }),
        new go.Binding("toSpot", "dir", function(d) { return this.spotConverter(d, false); })),
        // remember the locations of each node in the node data
        new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
        // make sure text "grows" in the desired direction
        new go.Binding("locationSpot", "dir", function(d) { return this.spotConverter(d, false); })
      );

      this.myDiagram.nodeTemplate.contextMenu =
        this.$("ContextMenu",
          this.$("ContextMenuButton",
            this.$(go.TextBlock, "Bigger"),
            { click: function(e, obj) { this.changeTextSize(obj, 1.1); } }),
          this.$("ContextMenuButton",
            this.$(go.TextBlock, "Smaller"),
            { click: function(e, obj) { this.changeTextSize(obj, 1 / 1.1); } }),
          this.$("ContextMenuButton",
            this.$(go.TextBlock, "Bold/Normal"),
            { click: function(e, obj) { this.toggleTextWeight(obj); } }),
          this.$("ContextMenuButton",
            this.$(go.TextBlock, "Copy"),
            { click: function(e, obj) { e.diagram.commandHandler.copySelection(); } }),
          this.$("ContextMenuButton",
            this.$(go.TextBlock, "Delete"),
            { click: function(e, obj) { e.diagram.commandHandler.deleteSelection(); } }),
          this.$("ContextMenuButton",
            this.$(go.TextBlock, "Undo"),
            { click: function(e, obj) { e.diagram.commandHandler.undo(); } }),
          this.$("ContextMenuButton",
            this.$(go.TextBlock, "Redo"),
            { click: function(e, obj) { e.diagram.commandHandler.redo(); } }),
          this.$("ContextMenuButton",
            this.$(go.TextBlock, "Layout"),
            {
              click: function(e, obj) {
                var adorn = obj.part;
                adorn.diagram.startTransaction("Subtree Layout");
                this.layoutTree(adorn['adornedPart']);
                adorn.diagram.commitTransaction("Subtree Layout");
              }
            }
          )
        );

      // a link is just a Bezier-curved line of the same color as the node to which it is connected
      this.myDiagram.linkTemplate =
        this.$(go.Link,
          {
            curve: go.Link.Bezier,
            fromShortLength: -2,
            toShortLength: -2,
            selectable: false
          },
        this.$(go.Shape,
          { strokeWidth: 3 },
            new go.Binding("stroke", "toNode", function(n) {
            if (n.data.brush) return n.data.brush;
            return "black";
          }).ofObject())
        );

      // the Diagram's context menu just displays commands for general functionality
      this.myDiagram.contextMenu =
        this.$("ContextMenu",
          this.$("ContextMenuButton",
            this.$(go.TextBlock, "Paste"),
            { click: function (e, obj) { e.diagram.commandHandler.pasteSelection(e.diagram.toolManager.contextMenuTool.mouseDownPoint); } },
            new go.Binding("visible", "", function(o) { return o.diagram && o.diagram.commandHandler.canPasteSelection(o.diagram.toolManager.contextMenuTool.mouseDownPoint); }).ofObject()),
          this.$("ContextMenuButton",
            this.$(go.TextBlock, "Undo"),
            { click: function(e, obj) { e.diagram.commandHandler.undo(); } },
            new go.Binding("visible", "", function(o) { return o.diagram && o.diagram.commandHandler.canUndo(); }).ofObject()),
          this.$("ContextMenuButton",
            this.$(go.TextBlock, "Redo"),
            { click: function(e, obj) { e.diagram.commandHandler.redo(); } },
            new go.Binding("visible", "", function(o) { return o.diagram && o.diagram.commandHandler.canRedo(); }).ofObject()),
          this.$("ContextMenuButton",
            this.$(go.TextBlock, "Save"),
            { click: function(e, obj) { this.save(); } }),
          this.$("ContextMenuButton",
            this.$(go.TextBlock, "Load"),
            { click: function(e, obj) { this.load(); } })
        );
      this.load();
  }

  spotConverter(dir, from) {
    if (dir === "left") {
      return (from ? go.Spot.Left : go.Spot.Right);
    } else {
      return (from ? go.Spot.Right : go.Spot.Left);
    }
  }

  changeTextSize(obj, factor) {
    var adorn = obj.part;
    adorn.diagram.startTransaction("Change Text Size");
    var node = adorn.adornedPart;
    var tb = node.findObject("TEXT");
    tb.scale *= factor;
    adorn.diagram.commitTransaction("Change Text Size");
  }

  toggleTextWeight(obj) {
    var adorn = obj.part;
    adorn.diagram.startTransaction("Change Text Weight");
    var node = adorn.adornedPart;
    var tb = node.findObject("TEXT");
    // assume "bold" is at the start of the font specifier
    var idx = tb.font.indexOf("bold");
    if (idx < 0) {
      tb.font = "bold " + tb.font;
    } else {
      tb.font = tb.font.substr(idx + 5);
    }
    adorn.diagram.commitTransaction("Change Text Weight");
  }

  updateNodeDirection(node, dir) {
    this.myDiagram.model.setDataProperty(node.data, "dir", dir);
    // recursively update the direction of the child nodes
    var chl = node.findTreeChildrenNodes(); // gives us an iterator of the child nodes related to this particular node
    while (chl.next()) {
      this.updateNodeDirection(chl.value, dir);
    }
  }

  layoutTree(node) {
    if (node.data.key === 0) {  // adding to the root?
      this.layoutAll();  // lay out everything
    } else {  // otherwise lay out only the subtree starting at this parent node
      var parts = node.findTreeParts();
      this.layoutAngle(parts, node.data.dir === "left" ? 180 : 0);
    }
  }

  layoutAngle(parts, angle) {
    var layout = go.GraphObject.make(go.TreeLayout,
      {
        angle: angle,
        arrangement: go.TreeLayout.ArrangementFixedRoots,
        nodeSpacing: 5,
        layerSpacing: 20,
        setsPortSpot: false, // don't set port spots since we're managing them with our spotConverter function
        setsChildPortSpot: false
      });
    layout.doLayout(parts);
  }

  layoutAll() {
    var root = this.myDiagram.findNodeForKey(0);
    if (root === null) return;
    this.myDiagram.startTransaction("Layout");
    // split the nodes and links into two collections
    var rightward = new go.Set(/*go.Part*/);
    var leftward = new go.Set(/*go.Part*/);
    root.findLinksConnected().each(function(link) {
      var child = link.toNode;
      if (child.data.dir === "left") {
        leftward.add(root);  // the root node is in both collections
        leftward.add(link);
        leftward.addAll(child.findTreeParts());
      } else {
        rightward.add(root);  // the root node is in both collections
        rightward.add(link);
        rightward.addAll(child.findTreeParts());
      }
    });
    // do one layout and then the other without moving the shared root node
    this.layoutAngle(rightward, 0);
    this.layoutAngle(leftward, 180);
    this.myDiagram.commitTransaction("Layout");
  }

  load() {
    let val = { 
      "class": "go.TreeModel",
      "nodeDataArray": [
      {"key":0, "text":"Mind Map", "loc":"0 0"},
      {"key":1, "parent":0, "text":"Getting more time", "brush":"skyblue", "dir":"right", "loc":"77 -22"},
      {"key":11, "parent":1, "text":"Wake up early", "brush":"skyblue", "dir":"right", "loc":"200 -48"},
      {"key":12, "parent":1, "text":"Delegate", "brush":"skyblue", "dir":"right", "loc":"200 -22"},
      {"key":13, "parent":1, "text":"Simplify", "brush":"skyblue", "dir":"right", "loc":"200 4"},
      {"key":2, "parent":0, "text":"More effective use", "brush":"darkseagreen", "dir":"right", "loc":"77 43"},
      {"key":21, "parent":2, "text":"Planning", "brush":"darkseagreen", "dir":"right", "loc":"203 30"},
      {"key":211, "parent":21, "text":"Priorities", "brush":"darkseagreen", "dir":"right", "loc":"274 17"},
      {"key":212, "parent":21, "text":"Ways to focus", "brush":"darkseagreen", "dir":"right", "loc":"274 43"},
      {"key":22, "parent":2, "text":"Goals", "brush":"darkseagreen", "dir":"right", "loc":"203 56"},
      {"key":23, "parent":2, "text":"Homework", "brush":"darkseagreen", "dir":"right", "loc":"203 80"},
      {"key":24, "parent":0, "text":"Fish and Meal", "brush":"darkseagreen", "dir":"right", "loc":"77 67"},
      {"key":25, "parent":24, "text":"Good Morning", "brush":"red", "dir":"right", "loc":"200 -220"},
      ]
    }
    this.myDiagram.model = go.Model.fromJson(val);
  }

}

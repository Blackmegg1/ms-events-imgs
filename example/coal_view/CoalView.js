import * as THREE from '../../World/three/three.module.js';
import { OrbitControls } from '../../World/three/OrbitControls.js';
import { loadMsSensors, loadESensors, loadRoadways, loadStopMiningLine } from './load_data.js';

const CONFIG = {
    coalThickness: 7.3,
    protectBaseOffset: 150,
    protectThickness: 40,
    coalColor: 0x1a1a1a,       // 未开采：深煤色
    minedColor: 0x1a1a1a,      // 已开采：底色
    protectColor: 0x898989,
    opacity: 0.95,
    xOffset: 21.95,
    // 传感器状态颜色
    sensorColors: {
        "正常": 0x00ff00,
        "损坏": 0xff3333,
        "耦合不佳": 0xffaa00
    },
    minedOpacity: 1,           // 已开采区域透明度
    textureScale: 100.0,       // 纹理缩放比例
};

class CoalView extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.animationId = null;

        this.modelGroup = null;
        this.axesGroup = null;
        this.sensorGroup = null;

        this.animatedObjects = [];

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.center = new THREE.Vector3();
        this.resizeObserver = null;

        this.glowTexture = this.createGlowTexture();

        // 预加载碎石纹理
        this.textureLoader = new THREE.TextureLoader();
        const rubbleUrl = './assets/js/components/coal_view/gravel.jpg';
        this.rubbleTexture = this.textureLoader.load(rubbleUrl);
        this.rubbleTexture.wrapS = THREE.RepeatWrapping;
        this.rubbleTexture.wrapT = THREE.RepeatWrapping;
    }

    static get observedAttributes() {
        return ['src'];
    }

    connectedCallback() {
        this.renderDom();
        this.initThree();

        if (this.hasAttribute('src')) {
            this.loadData(this.getAttribute('src'));
        }

        this.resizeObserver = new ResizeObserver(() => this.onResize());
        this.resizeObserver.observe(this);
    }

    disconnectedCallback() {
        cancelAnimationFrame(this.animationId);
        if (this.resizeObserver) this.resizeObserver.disconnect();
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer.forceContextLoss();
        }
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'src' && oldValue !== newValue && newValue) {
            this.loadData(newValue);
        }
    }

    renderDom() {
        this.shadowRoot.innerHTML = `
            <style>
                :host { display: block; position: relative; width: 100%; height: 100%; overflow: hidden; }
                #canvas-container { width: 100%; height: 100%; }
                #ui-layer { position: absolute; top: 10px; left: 10px; pointer-events: none; }
                
                .legend { 
                    background: rgba(255, 255, 255, 0.9); 
                    padding: 10px; 
                    border-radius: 8px; 
                    font-family: sans-serif; 
                    font-size: 12px; 
                    box-shadow: 0 4px 10px rgba(0,0,0,0.1); 
                    backdrop-filter: blur(5px); 
                    border: 1px solid rgba(255,255,255,0.5); 
                    pointer-events: auto;
                }

                .legend-item { 
                    display: flex; align-items: center; margin-bottom: 5px; 
                    color: #333; cursor: pointer; transition: all 0.3s; user-select: none;
                }
                .legend-item:hover { opacity: 0.8; transform: translateX(2px); }
                .legend-item.disabled { opacity: 0.4; filter: grayscale(100%); text-decoration: line-through; }

                .dot { width: 12px; height: 12px; border-radius: 50%; margin-right: 8px; }
                .diamond { width: 10px; height: 10px; transform: rotate(45deg); margin-right: 8px; margin-left: 2px; }
                .square { width: 10px; height: 10px; margin-right: 8px; margin-left: 2px; }
                
                #tooltip {
                    position: absolute; display: none;
                    background: rgba(44, 62, 80, 0.95); color: #fff;
                    padding: 8px 12px; border-radius: 6px;
                    font-size: 12px; line-height: 1.5; pointer-events: none;
                    white-space: nowrap; z-index: 10;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                    border-left: 4px solid #00e5ff; 
                }
            </style>
            <div id="canvas-container"></div>
            <div id="ui-layer">
                <div class="legend" id="legend" style="display:none;">
                    <div class="legend-item" style="cursor:default;"><div class="dot" style="background:#898989;"></div>保护层 (40m)</div>
                    <div class="legend-item" style="cursor:default;"><div class="dot" style="background:#1a1a1a;"></div>煤层 (7.3m)</div>
                    <div style="height:1px; background:#ddd; margin:5px 0;"></div>
                    <div id="btn-toggle-ms" class="legend-item" title="点击 显示/隐藏 微震检波器">
                        <div class="diamond" style="background:#00ff00;"></div>微震检波器 (菱形)
                    </div>
                    <div id="btn-toggle-elec" class="legend-item" title="点击 显示/隐藏 电法电极">
                        <div class="square" style="background:#00ff00;"></div>电法电极 (方形)
                    </div>
                    <div style="height:1px; background:#ddd; margin:5px 0;"></div>
                    <div class="legend-item" style="cursor:default; font-size:11px; color:#666;">状态说明:</div>
                    <div class="legend-item" style="cursor:default;"><div class="dot" style="background:#00ff00;"></div>正常</div>
                    <div class="legend-item" style="cursor:default;"><div class="dot" style="background:#ff3333;"></div>损坏</div>
                    <div class="legend-item" style="cursor:default;"><div class="dot" style="background:#ffaa00;"></div>耦合不佳</div>
                </div>
            </div>
            <div id="tooltip"></div>
        `;

        // 绑定图例点击事件
        setTimeout(() => {
            const btnMs = this.shadowRoot.getElementById('btn-toggle-ms');
            const btnElec = this.shadowRoot.getElementById('btn-toggle-elec');
            if (btnMs) btnMs.onclick = () => this.toggleSensorType('ms', btnMs);
            if (btnElec) btnElec.onclick = () => this.toggleSensorType('elec', btnElec);
        }, 0);
    }

    toggleSensorType(type, domElement) {
        if (!this.sensorGroup) return;

        domElement.classList.toggle('disabled');
        const isHidden = domElement.classList.contains('disabled');
        const targetVisible = !isHidden;

        this.sensorGroup.children.forEach(child => {
            if (child.userData && child.userData.sensorType === type) {
                child.visible = targetVisible;
            }
        });
    }

    initThree() {
        const container = this.shadowRoot.getElementById('canvas-container');
        const width = container.clientWidth;
        const height = container.clientHeight;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf8f9fa);
        this.scene.fog = new THREE.Fog(0xf8f9fa, 2000, 10000);

        this.camera = new THREE.PerspectiveCamera(45, width / height, 1, 50000);
        this.camera.up.set(0, 0, 1);
        this.camera.position.set(1200, -1500, 1200);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.sortObjects = true;
        container.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = true;

        const ambient = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambient);
        const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
        mainLight.position.set(500, -500, 1000);
        this.scene.add(mainLight);
        const backLight = new THREE.DirectionalLight(0xecf0f1, 0.5);
        backLight.position.set(-500, 500, 200);
        this.scene.add(backLight);

        container.addEventListener('mousemove', (e) => this.onMouseMove(e));

        this.animate();
    }

    loadData(url) {
        if (typeof Papa === 'undefined') {
            console.error('PapaParse (Papa) is not defined.');
            return;
        }

        Papa.parse(url, {
            download: true,
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (res) => {
                if (res.data.length > 3) {
                    this.processData(res.data, res.meta.fields);
                    const legend = this.shadowRoot.getElementById('legend');
                    if (legend) legend.style.display = 'block';
                }
            },
            error: (err) => console.error("CSV Load Error:", err)
        });
    }

    async processData(data, fields) {
        const find = (n) => fields.find(f => f.trim().toUpperCase() === n);
        const [cX, cY, cZ] = [find('X'), find('Y'), find('Z')];
        if (!cX || !cY || !cZ) return;

        let rawPoints = [];
        let bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity };

        data.forEach(d => {
            const x = d[cX], y = d[cY], z = d[cZ];
            if (typeof x === 'number' && typeof z === 'number') {
                rawPoints.push({ x, y, z });
                bounds.minX = Math.min(bounds.minX, x); bounds.maxX = Math.max(bounds.maxX, x);
                bounds.minY = Math.min(bounds.minY, y); bounds.maxY = Math.max(bounds.maxY, y);
                bounds.minZ = Math.min(bounds.minZ, z); bounds.maxZ = Math.max(bounds.maxZ, z);
            }
        });

        this.center.set((bounds.minX + bounds.maxX) / 2, (bounds.minY + bounds.maxY) / 2, (bounds.minZ + bounds.maxZ) / 2);
        this.buildScene(rawPoints, bounds);

        try {
            const dataContainer = {};
            // 并行加载所有相关数据
            const [msRes, eRes, roadways] = await Promise.all([
                loadMsSensors(dataContainer),
                loadESensors(dataContainer),
                loadRoadways(),
                loadStopMiningLine(dataContainer)
            ]);

            this.renderSensors(dataContainer.msSensors || [], dataContainer.eSensors || []);

            if (roadways && roadways.length > 0) {
                this.renderRoadways(roadways, bounds);
            }

            if (dataContainer.stopMiningLine) {
                this.renderMiningLine(dataContainer.stopMiningLine, bounds, dataContainer.wfName);
            }
        } catch (e) {
            console.warn("数据加载失败:", e);
        }
    }

    buildScene(rawPoints, rawBounds) {
        if (this.modelGroup) this.scene.remove(this.modelGroup);
        if (this.axesGroup) this.scene.remove(this.axesGroup);
        if (this.sensorGroup) this.scene.remove(this.sensorGroup);

        this.modelGroup = new THREE.Group();
        this.axesGroup = new THREE.Group();
        this.sensorGroup = new THREE.Group();

        this.scene.add(this.modelGroup);
        this.scene.add(this.axesGroup);
        this.scene.add(this.sensorGroup);

        const points2D = rawPoints.map(p => [p.x, p.y]);

        if (typeof Delaunator === 'undefined') {
            console.error('Delaunator is not defined.');
            return;
        }
        const delaunay = Delaunator.from(points2D);

        const coalMesh = this.createSolidLayer(rawPoints, delaunay, 0, CONFIG.coalThickness, CONFIG.coalColor, "煤层");
        this.modelGroup.add(coalMesh);

        const protectMesh = this.createSolidLayer(rawPoints, delaunay, CONFIG.protectBaseOffset, CONFIG.protectBaseOffset + CONFIG.protectThickness, CONFIG.protectColor, "保护层");
        this.modelGroup.add(protectMesh);

        const totalMaxZ = rawBounds.maxZ + CONFIG.protectBaseOffset + CONFIG.protectThickness;
        const localBounds = {
            minX: rawBounds.minX - this.center.x,
            maxX: rawBounds.maxX - this.center.x,
            minY: rawBounds.minY - this.center.y,
            maxY: rawBounds.maxY - this.center.y,
            minZ: rawBounds.minZ - this.center.z,
            maxZ: totalMaxZ - this.center.z
        };
        this.createAxes(localBounds);

        const maxDim = Math.max(localBounds.maxX - localBounds.minX, localBounds.maxY - localBounds.minY);
        const dist = maxDim * 1.5;
        this.camera.position.set(dist, -dist, dist * 0.8);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
    }

    renderSensors(msSensors, eSensors) {
        this.animatedObjects = [];

        const geoMs = new THREE.OctahedronGeometry(10, 0);
        const geoElec = new THREE.BoxGeometry(14, 14, 14);

        const createBatch = (sensors, geometry, typeCode, typeTitle) => {
            sensors.forEach(sensor => {
                const colorHex = CONFIG.sensorColors[sensor.status] || 0xffffff;
                const color = new THREE.Color(colorHex);

                const material = new THREE.MeshStandardMaterial({
                    color: color,
                    emissive: color,
                    emissiveIntensity: 0.5,
                    roughness: 0.2,
                    metalness: 0.8
                });

                const mesh = new THREE.Mesh(geometry, material);
                mesh.position.set(
                    sensor.x - this.center.x,
                    sensor.y - this.center.y,
                    sensor.z - this.center.z
                );

                const spriteMaterial = new THREE.SpriteMaterial({
                    map: this.glowTexture,
                    color: color,
                    transparent: true,
                    opacity: 0.6,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false
                });
                const sprite = new THREE.Sprite(spriteMaterial);
                sprite.scale.set(50, 50, 1);
                mesh.add(sprite);

                // 绑定元数据
                mesh.userData = {
                    type: 'sensor',
                    sensorType: typeCode,
                    sensorTitle: typeTitle,
                    label: sensor.label,
                    status: sensor.status,
                    rawX: sensor.x, rawY: sensor.y, rawZ: sensor.z
                };

                this.animatedObjects.push(mesh);
                this.sensorGroup.add(mesh);
            });
        };

        if (msSensors.length > 0) createBatch(msSensors, geoMs, 'ms', '微震检波器');
        if (eSensors.length > 0) createBatch(eSensors, geoElec, 'elec', '电法电极');

        console.log(`传感器加载完成: 微震 ${msSensors.length}, 电极 ${eSensors.length}`);
    }

    renderRoadways(roadways, rawBounds) {
        const localBounds = {
            minX: rawBounds.minX - this.center.x,
            maxX: rawBounds.maxX - this.center.x,
            minY: rawBounds.minY - this.center.y,
            maxY: rawBounds.maxY - this.center.y,
            midZ: ((rawBounds.minZ + rawBounds.maxZ) / 2) - this.center.z
        };

        const centerX = (localBounds.minX + localBounds.maxX) / 2;
        const padding = 80;

        roadways.forEach(road => {
            let posX = centerX;
            let posY = 0;
            let posZ = localBounds.midZ;

            if (road.position === 'max_y') {
                posY = localBounds.maxY + padding;
            } else if (road.position === 'min_y') {
                posY = localBounds.minY - padding;
            }

            const labelSprite = this.makeText(road.name, 32, road.color, true);
            labelSprite.position.set(posX, posY, posZ);
            this.axesGroup.add(labelSprite);

            this.addLeaderLine(posX, posY, posZ, posX, (road.position === 'max_y' ? localBounds.maxY : localBounds.minY), posZ, road.color);
        });
    }

    renderMiningLine(lineInfo, rawBounds, wfName) {
        const locX = lineInfo.locx + CONFIG.xOffset;  // 偏移校正
        const dir = lineInfo.dir;

        if (locX < rawBounds.minX || locX > rawBounds.maxX) {
            console.warn(`回采位置 X:${locX} 超出了显示范围`);
        }

        const localX = locX - this.center.x;
        const coalMesh = this.modelGroup.getObjectByName("煤层");
        if (!coalMesh) return;

        // 1. 绘制飘带 (Ribbon)
        const ribbonWidth = 10;
        const halfWidth = ribbonWidth / 2;
        const step = 40;
        const localMinY = rawBounds.minY - this.center.y;
        const localMaxY = rawBounds.maxY - this.center.y;

        const vertices = [];
        const indices = [];
        const raycaster = new THREE.Raycaster();
        const downVector = new THREE.Vector3(0, 0, -1);
        const highZ = 50000;

        const getTerrainHeight = (x, y) => {
            raycaster.set(new THREE.Vector3(x, y, highZ), downVector);
            const intersects = raycaster.intersectObject(coalMesh);
            return intersects.length > 0 ? intersects[0].point.z + 1.5 : null;
        };

        let vIndex = 0;
        for (let y = localMinY; y <= localMaxY; y += step) {
            const zLeft = getTerrainHeight(localX - halfWidth, y);
            const zRight = getTerrainHeight(localX + halfWidth, y);
            if (zLeft === null || zRight === null) continue;

            vertices.push(localX - halfWidth, y, zLeft);
            vertices.push(localX + halfWidth, y, zRight);

            if (vIndex > 0) {
                const currL = vIndex * 2, currR = vIndex * 2 + 1;
                const prevL = (vIndex - 1) * 2, prevR = (vIndex - 1) * 2 + 1;
                indices.push(prevL, prevR, currL);
                indices.push(prevR, currR, currL);
            }
            vIndex++;
        }

        if (vertices.length >= 6) {
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            geometry.setIndex(indices);
            geometry.computeVertexNormals();

            const material = new THREE.MeshStandardMaterial({
                color: 0xff00ff,
                emissive: 0xff00ff,
                emissiveIntensity: 0.6,
                side: THREE.DoubleSide,
                roughness: 0.5,
                metalness: 0.1
            });
            const ribbonMesh = new THREE.Mesh(geometry, material);
            this.axesGroup.add(ribbonMesh);

            // 2. 绘制标注
            const midIdx = Math.floor(vertices.length / 2);
            const safeMidIdx = midIdx - (midIdx % 3);
            const labelX = vertices[safeMidIdx];
            const labelZ = vertices[safeMidIdx + 2];

            // 坐标标注
            const coordLabel = this.makeText(`当前回采位置: ${lineInfo.locx}米`, 32, "#ff00ff", true);
            coordLabel.position.set(labelX, localMaxY + 60, labelZ + 40);
            this.axesGroup.add(coordLabel);

            // 工作面名称标题
            // if (wfName) {
            //     const titleLabel = this.makeText(wfName, 80, "#e74c3c", true);
            //     titleLabel.position.set(labelX, localMaxY + 60, labelZ + 100);
            //     this.axesGroup.add(titleLabel);
            // }

            this.addLeaderLine(labelX, localMaxY + 60, labelZ + 40, labelX, localMaxY, labelZ, 0xff00ff);
        }

        // 3. 更新 Shader (Triplanar Mapping 采空区效果)
        if (coalMesh && coalMesh.material.userData.uniforms) {
            const uniforms = coalMesh.material.userData.uniforms;
            const shaderDir = (dir == 1) ? 1.0 : -1.0;
            uniforms.uMiningX.value = localX;
            uniforms.uDir.value = shaderDir;
            coalMesh.material.needsUpdate = true;
        }
    }

    addLeaderLine(x1, y1, z1, x2, y2, z2, color) {
        const material = new THREE.LineDashedMaterial({
            color: color,
            dashSize: 10,
            gapSize: 5,
            opacity: 0.6,
            transparent: true
        });
        const points = [];
        points.push(new THREE.Vector3(x1, y1, z1));
        points.push(new THREE.Vector3(x2, y2, z2));

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, material);
        line.computeLineDistances();
        this.axesGroup.add(line);
    }

    createGlowTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.4)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);
        return new THREE.CanvasTexture(canvas);
    }

    createSolidLayer(points, delaunay, bottomOffset, topOffset, color, name) {
        const vertices = [];
        const indices = [];
        const numPoints = points.length;

        points.forEach(p => vertices.push(p.x - this.center.x, p.y - this.center.y, p.z - this.center.z + bottomOffset));
        points.forEach(p => vertices.push(p.x - this.center.x, p.y - this.center.y, p.z - this.center.z + topOffset));

        const tris = delaunay.triangles;
        for (let i = 0; i < tris.length; i += 3) indices.push(tris[i] + numPoints, tris[i + 1] + numPoints, tris[i + 2] + numPoints);
        for (let i = 0; i < tris.length; i += 3) indices.push(tris[i], tris[i + 2], tris[i + 1]);

        const halfedges = delaunay.halfedges;
        for (let e = 0; e < halfedges.length; e++) {
            if (halfedges[e] === -1) {
                const pStart = tris[e];
                const pEnd = tris[(e % 3 === 2) ? e - 2 : e + 1];
                indices.push(pStart, pEnd, pEnd + numPoints);
                indices.push(pStart, pEnd + numPoints, pStart + numPoints);
            }
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geo.setIndex(indices);
        geo.computeVertexNormals();

        const matConfig = {
            color: color,
            metalness: 0.0,
            roughness: 0.9,
            transparent: true,
            opacity: CONFIG.opacity,
            side: THREE.DoubleSide,
            depthWrite: true
        };

        const mat = new THREE.MeshPhysicalMaterial(matConfig);

        // 注入 Shader 实现 Triplanar Mapping 纹理与采空区效果
        if (name === "煤层") {
            mat.userData.uniforms = {
                uMiningX: { value: -999999 },
                uUnminedColor: { value: new THREE.Color(CONFIG.coalColor) },
                uMinedOpacity: { value: CONFIG.minedOpacity },
                uUnminedOpacity: { value: CONFIG.opacity },
                uDir: { value: 1.0 },
                uRubbleMap: { value: this.rubbleTexture },
                uTextureScale: { value: CONFIG.textureScale }
            };

            mat.onBeforeCompile = (shader) => {
                // 1. Uniforms
                Object.keys(mat.userData.uniforms).forEach(key => {
                    shader.uniforms[key] = mat.userData.uniforms[key];
                });

                // 2. Vertex: 获取世界坐标
                shader.vertexShader = `
                    varying vec3 vWorldPosition;
                    ${shader.vertexShader}
                `.replace(
                    '#include <worldpos_vertex>',
                    `#include <worldpos_vertex>
                     vWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;`
                );

                // 3. Fragment: Triplanar Mapping 逻辑
                shader.fragmentShader = `
                    uniform float uMiningX;
                    uniform vec3 uUnminedColor;
                    uniform float uMinedOpacity;
                    uniform float uUnminedOpacity;
                    uniform float uDir;
                    uniform sampler2D uRubbleMap;
                    uniform float uTextureScale;
                    
                    varying vec3 vWorldPosition;
                    ${shader.fragmentShader}
                `.replace(
                    '#include <color_fragment>',
                    `#include <color_fragment>
                     
                     bool isMined = (uDir > 0.0) ? (vWorldPosition.x < uMiningX) : (vWorldPosition.x > uMiningX);

                     if (isMined) {
                         // Triplanar Mapping 算法
                         vec3 blendWeights = abs(vNormal);
                         blendWeights = (blendWeights - 0.2) * 7.0;  
                         blendWeights = max(blendWeights, 0.0);      
                         blendWeights /= (blendWeights.x + blendWeights.y + blendWeights.z);

                         vec2 coordX = vWorldPosition.yz / uTextureScale;
                         vec2 coordY = vWorldPosition.zx / uTextureScale;
                         vec2 coordZ = vWorldPosition.xy / uTextureScale;

                         vec4 blendedRubble = texture2D(uRubbleMap, coordX) * blendWeights.x +
                                              texture2D(uRubbleMap, coordY) * blendWeights.y +
                                              texture2D(uRubbleMap, coordZ) * blendWeights.z;
                         
                         diffuseColor.rgb = blendedRubble.rgb * vec3(0.6); // 压暗纹理
                         diffuseColor.a = uMinedOpacity;
                     } else {
                         diffuseColor.rgb = uUnminedColor;
                         diffuseColor.a = uUnminedOpacity;
                     }
                    `
                );
            };
        }

        const mesh = new THREE.Mesh(geo, mat);
        mesh.name = name;
        mesh.userData = { type: 'layer' };
        return mesh;
    }

    createAxes(b) {
        const pad = Math.max(b.maxX - b.minX, b.maxY - b.minY, b.maxZ - b.minZ) * 0.1;
        const minX = b.minX - pad, maxX = b.maxX + pad;
        const minY = b.minY - pad, maxY = b.maxY + pad;
        const minZ = b.minZ - pad, maxZ = b.maxZ + pad;

        const frameMat = new THREE.LineBasicMaterial({ color: 0xbdc3c7, opacity: 0.8, transparent: true });
        const bottomGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(minX, minY, minZ), new THREE.Vector3(maxX, minY, minZ),
            new THREE.Vector3(maxX, minY, minZ), new THREE.Vector3(maxX, maxY, minZ),
            new THREE.Vector3(maxX, maxY, minZ), new THREE.Vector3(minX, maxY, minZ),
            new THREE.Vector3(minX, maxY, minZ), new THREE.Vector3(minX, minY, minZ)
        ]);
        this.axesGroup.add(new THREE.LineSegments(bottomGeo, frameMat));

        const wallGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(minX, maxY, minZ), new THREE.Vector3(minX, maxY, maxZ),
            new THREE.Vector3(maxX, maxY, minZ), new THREE.Vector3(maxX, maxY, maxZ),
            new THREE.Vector3(minX, minY, minZ), new THREE.Vector3(minX, minY, maxZ),
            new THREE.Vector3(minX, maxY, maxZ), new THREE.Vector3(maxX, maxY, maxZ),
            new THREE.Vector3(minX, minY, maxZ), new THREE.Vector3(minX, maxY, maxZ),
        ]);
        this.axesGroup.add(new THREE.LineSegments(wallGeo, frameMat));

        const gridMat = new THREE.LineBasicMaterial({ color: 0xe0e0e0, opacity: 0.6, transparent: true });
        this.axesGroup.add(this.createGrid(minX, maxX, minY, maxY, minZ, 'z', gridMat));
        this.axesGroup.add(this.createGrid(minX, maxX, minZ, maxZ, maxY, 'y', gridMat));
        this.axesGroup.add(this.createGrid(minY, maxY, minZ, maxZ, minX, 'x', gridMat));

        this.createTicksAndLabels('x', minX, maxX, maxY, minZ);
        this.createTicksAndLabels('y', minY, maxY, minX, minZ);
        this.createTicksAndLabels('z', minZ, maxZ, minX, maxY);

        this.addAxisTitle("X", maxX + pad / 2, maxY, minZ, 0xe74c3c);
        this.addAxisTitle("Y", minX, minY - pad / 2, minZ, 0x27ae60);
        this.addAxisTitle("Z", minX, maxY, maxZ + pad / 2, 0x2980b9);
    }

    createGrid(uMin, uMax, vMin, vMax, fixed, axis, mat) {
        const pts = [];
        const steps = 6;
        for (let i = 0; i <= steps; i++) {
            const u = uMin + (uMax - uMin) * (i / steps);
            const v = vMin + (vMax - vMin) * (i / steps);
            if (axis === 'z') { pts.push(u, vMin, fixed, u, vMax, fixed); pts.push(uMin, v, fixed, uMax, v, fixed); }
            else if (axis === 'y') { pts.push(u, fixed, vMin, u, fixed, vMax); pts.push(uMin, fixed, v, uMax, fixed, v); }
            else { pts.push(fixed, u, vMin, fixed, u, vMax); pts.push(fixed, uMin, v, fixed, uMax, v); }
        }
        return new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)), mat);
    }

    createTicksAndLabels(axis, min, max, fixed1, fixed2) {
        const count = 5;
        const step = (max - min) / count;
        const tickMat = new THREE.LineBasicMaterial({ color: 0x7f8c8d });
        const tickLen = (max - min) * 0.02;
        const pts = [];

        for (let i = 0; i <= count; i++) {
            const val = min + i * step;
            let pos = new THREE.Vector3();
            let realVal = 0;

            if (axis === 'x') {
                pos.set(val, fixed1, fixed2); realVal = val + this.center.x;
                pts.push(val, fixed1, fixed2, val, fixed1, fixed2 + tickLen);
            }
            if (axis === 'y') {
                pos.set(fixed1, val, fixed2); realVal = val + this.center.y;
                pts.push(fixed1, val, fixed2, fixed1 - tickLen, val, fixed2);
            }
            if (axis === 'z') {
                pos.set(fixed1, fixed2, val); realVal = val + this.center.z;
                pts.push(fixed1, fixed2, val, fixed1 - tickLen, fixed2, val);
            }

            const labelPos = pos.clone();
            if (axis === 'x') { labelPos.y += 15; labelPos.z -= 10; }
            if (axis === 'y') { labelPos.x -= 30; }
            if (axis === 'z') { labelPos.x -= 30; labelPos.y += 10; }

            const sprite = this.makeText(realVal.toFixed(0));
            sprite.position.copy(labelPos);
            this.axesGroup.add(sprite);
        }
        this.axesGroup.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)), tickMat));
    }

    addAxisTitle(text, x, y, z, colorHex) {
        const sprite = this.makeText(text, 24, '#' + new THREE.Color(colorHex).getHexString(), true);
        sprite.position.set(x, y, z);
        this.axesGroup.add(sprite);
    }

    makeText(str, size = 20, color = "#555", isBold = false) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const renderFontSize = 64;
        const fontSpec = `${isBold ? "bold" : "500"} ${renderFontSize}px 'Segoe UI', Arial, sans-serif`;
        ctx.font = fontSpec;
        const textWidth = ctx.measureText(str).width;
        canvas.width = Math.ceil(textWidth + renderFontSize * 2);
        canvas.height = Math.ceil(renderFontSize * 2.5);
        ctx.font = fontSpec;
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(str, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;

        const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false });
        const sprite = new THREE.Sprite(mat);
        sprite.renderOrder = 999;
        const aspect = canvas.width / canvas.height;
        const displayHeight = size * 1.8;
        sprite.scale.set(displayHeight * aspect, displayHeight, 1);
        return sprite;
    }

    onMouseMove(e) {
        const rect = this.shadowRoot.getElementById('canvas-container').getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        const objectsToCheck = [];
        if (this.modelGroup) objectsToCheck.push(...this.modelGroup.children);
        if (this.sensorGroup) objectsToCheck.push(...this.sensorGroup.children);

        const intersects = this.raycaster.intersectObjects(objectsToCheck, false);
        const tooltip = this.shadowRoot.getElementById('tooltip');

        if (intersects.length > 0) {
            const hit = intersects[0];
            const p = hit.point;

            tooltip.style.display = 'block';
            tooltip.style.left = (e.clientX - rect.left + 15) + 'px';
            tooltip.style.top = (e.clientY - rect.top + 15) + 'px';

            if (hit.object.userData.type === 'sensor') {
                const d = hit.object.userData;
                const statusColor = CONFIG.sensorColors[d.status] ? `#${new THREE.Color(CONFIG.sensorColors[d.status]).getHexString()}` : '#fff';

                tooltip.innerHTML = `
                    <span style="color:#00e5ff; font-weight:bold;">${d.sensorTitle}: ${d.label}</span><br>
                    状态: <b style="color:${statusColor}">${d.status}</b><br>
                    X: ${d.rawX.toFixed(1)}<br>
                    Y: ${d.rawY.toFixed(1)}<br>
                    Z: ${d.rawZ.toFixed(2)}
                `;
            } else {
                const rx = p.x + this.center.x;
                const ry = p.y + this.center.y;
                const rz = p.z + this.center.z;
                tooltip.innerHTML = `
                    <span style="color:#bdc3c7">${hit.object.name}</span><br>
                    X: <b>${rx.toFixed(1)}</b><br>
                    Y: <b>${ry.toFixed(1)}</b><br>
                    Z: <b style="color:#f1c40f">${rz.toFixed(2)}</b>
                `;
            }
        } else {
            tooltip.style.display = 'none';
        }
    }

    onResize() {
        if (!this.camera || !this.renderer) return;
        const container = this.shadowRoot.getElementById('canvas-container');
        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
    }

    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

customElements.define('coal-view', CoalView);
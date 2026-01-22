async function loadMsSensors(obj) {
    const url = `../table/e_chns_config/chn_label:str,loc_x,loc_y,loc_z,state_id/type_id=0`;
    const res = await fetch(escape(url));
    if (res.status !== 200) {
        alert(`没查到微震检波器参数，请检查！`);
        return false;
    }
    const json = await res.json();
    obj.msSensors = json.data.map(obj => {
        return {
            x: obj.loc_x,
            y: obj.loc_y,
            z: obj.loc_z,
            label: obj.chn_label,
            status: (obj.state_id == 0 ? "正常" : (obj.state_id == 1 ? "损坏" : "耦合不佳"))
        };
    });
    return true;
}

async function loadESensors(obj) {
    const url = `../table/e_chns_config/chn_label:str,loc_x,loc_y,loc_z,state_id/type_id=1`;
    const res = await fetch(escape(url));
    if (res.status !== 200) {
        alert(`没查到电极参数，请检查！`);
        return false;
    }
    const json = await res.json();
    obj.eSensors = json.data.map(obj => {
        return {
            x: obj.loc_x,
            y: obj.loc_y,
            z: obj.loc_z,
            label: obj.chn_label,
            status: (obj.state_id == 0 ? "正常" : (obj.state_id == 1 ? "损坏" : "耦合不佳"))
        };
    });
    return true;
}

async function loadStopMiningLine(obj) {
    const url = `../table/e_daily_sheet_config/mining_locx,mining_dir,wf_name:str`;
    const res = await fetch(escape(url));
    if (res.status !== 200) {
        alert(`没查到回采信息，请检查！`);
        return false;
    }
    const json = await res.json();
    obj.stopMiningLine = {
        locx: json.data[0].mining_locx,
        dir: json.data[0].mining_dir
    };
    obj.wfName = json.data[0].wf_name;
    return true;
}

async function loadRoadways() {
    // 模拟网络延迟
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve([
                {
                    name: "0902工作面回风顺槽",
                    position: "max_y", // 标识：放在Y值大的一侧
                    color: "#e74c3c"   // 红色系，醒目
                },
                {
                    name: "0902工作面运输顺槽",
                    position: "min_y", // 标识：放在Y值小(接近0)的一侧
                    color: "#2ecc71"   // 绿色系，代表运输/安全
                }
            ]);
        }, 100);
    });
}


export { loadMsSensors, loadESensors, loadRoadways, loadStopMiningLine };

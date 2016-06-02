// Apply a smooth rotation about the origin between 2 positions
function Rotation(start_position, end_position) {
    this.start = new THREE.Vector3();
    this.start.copy(start_position);
    this.time = new THREE.Clock();
    var start_length;
    var end_length;
    if (end_position) {
        this.end = new THREE.Vector3();
        this.end.copy(end_position);
        this.axis = new THREE.Vector3();
        this.axis.crossVectors(start_position, end_position);
        start_length = start_position.length();
        end_length = end_position.length();
        this.length_ratio = end_length / start_length;
        this.angle = this.angleTo(this.end);
        this.axis.normalize();
    }
}

Rotation.prototype.moveTo = function(end_position) {
    this.start.copy(this.get_position());
    var start_length;
    var end_length;
    if (end_position) {
        this.end = new THREE.Vector3();
        this.end.copy(end_position);
        this.time = new THREE.Clock();
        this.time.start();
        this.axis = new THREE.Vector3();
        this.axis.crossVectors(this.start, end_position);
        start_length = this.start.length();
        end_length = end_position.length();
        this.length_ratio = end_length / start_length;
        this.angle = this.start.angleTo(this.end);
        this.axis.normalize();
    }
}

Rotation.prototype.get_position = function() {
    var interval = this.time.getElapsedTime();
    var position = new THREE.Vector3();
    position.copy(this.start);
    var progress;
    var angle;
    var lenth;
    if (interval < 0.999 && this.end) {
        progress = Math.cos(interval * Math.PI / 2.0);
        progress = progress * progress;
        progress = 1 - progress / 2;
        position.copy(this.start);
        position.applyAxisAngle(this.axis, this.angle * progress);
        length = 1 + progress * (this.length_ratio - 1);
        position.multiplyScalar(length);
    } else if (this.end) {
        position.copy(this.end);
    }
    return position;
}
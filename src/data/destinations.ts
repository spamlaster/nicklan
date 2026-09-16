export type Destination = {
  id: string;
  number: string;
  name: string;
  description: string;
  summary: string;
  color: string;
  position: {
    left: string;
    top: string;
  };
  /** Position in the 3D "/explore" world, as [x, z] world units. */
  worldPosition: [number, number];
};

export const destinations: Destination[] = [
  {
    id: "garage",
    summary: "A place for machines, hands-on projects, and solving practical problems.",
    number: "01",
    name: "The Garage",
    description: "Machines & problem solving",
    color: "#e0a62b",
    position: { left: "24%", top: "55%" },
    worldPosition: [-78, 60],
  },
  {
    id: "workshop",
    summary: "Software, invention, and ideas brought to life through building.",
    number: "02",
    name: "The Workshop",
    description: "Software & invention",
    color: "#45c8c3",
    position: { left: "36%", top: "48%" },
    worldPosition: [-25, -43],
  },
  {
    id: "growcube",
    summary: "Connecting automation with the real world through GrowCube.",
    number: "03",
    name: "GrowCube",
    description: "Automation in the real world",
    color: "#72c95a",
    position: { left: "50%", top: "55%" },
    worldPosition: [34, 68],
  },
  {
    id: "airstrip",
    summary: "Backcountry flying brings together preparation, judgment and the freedom to explore places far beyond a paved runway.",
    number: "04",
    name: "The Airstrip",
    description: "Backcountry aviation",
    color: "#5eb9d6",
    position: { left: "73%", top: "42%" },
    worldPosition: [85, -34],
  },
  {
    id: "trailhead",
    summary: "A starting point for outdoor adventures and exploring beyond the pavement.",
    number: "05",
    name: "The Trailhead",
    description: "Outside is better",
    color: "#ef6c50",
    position: { left: "87%", top: "65%" },
    worldPosition: [133, 77],
  },
  {
    id: "home",
    summary: "The reason behind it all: a place to return to after every project and adventure.",
    number: "06",
    name: "Home Base",
    description: "The reason behind it all",
    color: "#e5c557",
    position: { left: "8%", top: "46%" },
    worldPosition: [-122, -51],
  },
];
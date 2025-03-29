import { Plane } from "@react-three/drei";
import { useFighting } from "../lib/stores/useFighting";
import * as THREE from "three";

export default function Arena() {
  const platforms = useFighting((state) => state.platformPositions);
  
  return (
    <>
      {/* 2D background - 검은색 배경으로 변경 */}
      <Plane 
        position={[0, 0, -10]} 
        args={[100, 50]} // 충분히 넓은 배경
        rotation={[0, 0, 0]}
      >
        <meshBasicMaterial 
          color="#000000" // 검은색 배경
          transparent={false}
        />
      </Plane>
      
      {/* 2D platforms - 단단한 충돌 감지를 위한 플랫폼 */}
      {platforms.map((platform, index) => {
        // 메인 플랫폼은 더 넓게
        const width = platform[0] === 0 ? 14 : 4;
        const height = 0.5;
        
        return (
          <group key={index}>
            {/* Platform - visibility improved for black background */}
            <Plane
              position={[platform[0], platform[1], 0]}
              args={[width, height]}
              rotation={[0, 0, 0]}
              receiveShadow
            >
              <meshStandardMaterial 
                color="#555555" // 어두운 회색 플랫폼
                roughness={0.7}
                metalness={0.2}
                emissive="#333333" // 약간의 발광 효과 추가
              />
            </Plane>
            
            {/* Platform top border - glowing edge for better visibility */}
            <Plane
              position={[platform[0], platform[1] + height/2 - 0.05, 0.01]}
              args={[width, 0.1]}
              rotation={[0, 0, 0]}
            >
              <meshStandardMaterial 
                color="#AAAAAA" // 밝은 회색 테두리
                transparent={false}
                emissive="#FFFFFF" // 빛나는 효과
                emissiveIntensity={0.5}
              />
            </Plane>
            
            {/* Platform shadow - for depth perception */}
            <Plane
              position={[platform[0], platform[1] - 0.3, -0.1]}
              args={[width, 0.2]}
              rotation={[0, 0, 0]}
            >
              <meshBasicMaterial 
                color="#000000" 
                transparent={true} 
                opacity={0.5} 
              />
            </Plane>
          </group>
        );
      })}
      
      {/* 하단 위험 영역 */}
      <Plane
        position={[0, -5, 0]}
        args={[100, 2]}
        rotation={[0, 0, 0]}
      >
        <meshBasicMaterial color="#FF4500" /> {/* 선명한 빨간색으로 변경 */}
      </Plane>
    </>
  );
}

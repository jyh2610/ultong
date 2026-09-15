import { useEffect, useRef, useState } from "react";
import { View } from "react-native";

import { Text } from "./AppText";

const KAKAO_JS_KEY = process.env.EXPO_PUBLIC_KAKAO_JS_KEY;

export type MapPoint = {
  contentId: string;
  lat: number;
  lon: number;
};

type PlacesMapViewProps = {
  points: MapPoint[];
  showRoute?: boolean;
  onMarkerPress?: (contentId: string) => void;
};

declare global {
  interface Window {
    kakao: any;
  }
}

let kakaoSdkPromise: Promise<void> | null = null;

function loadKakaoSdk(): Promise<void> {
  if (window.kakao?.maps) return Promise.resolve();
  if (kakaoSdkPromise) return kakaoSdkPromise;

  kakaoSdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&autoload=false`;
    script.onload = () => window.kakao.maps.load(() => resolve());
    script.onerror = () => reject(new Error("Kakao maps SDK load failed"));
    document.head.appendChild(script);
  });

  return kakaoSdkPromise;
}

export function PlacesMapView({ points, showRoute = false, onMarkerPress }: PlacesMapViewProps) {
  const containerRef = useRef<View>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (points.length === 0 || !KAKAO_JS_KEY) return;

    let cancelled = false;

    loadKakaoSdk()
      .then(() => {
        if (cancelled) return;
        const node = containerRef.current as unknown as HTMLElement | null;
        if (!node) return;

        const map = new window.kakao.maps.Map(node, {
          center: new window.kakao.maps.LatLng(points[0].lat, points[0].lon),
          level: 7,
        });

        const bounds = new window.kakao.maps.LatLngBounds();
        const linePath: any[] = [];

        points.forEach((point) => {
          const position = new window.kakao.maps.LatLng(point.lat, point.lon);
          const marker = new window.kakao.maps.Marker({ map, position });
          window.kakao.maps.event.addListener(marker, "click", () => {
            onMarkerPress?.(point.contentId);
          });
          bounds.extend(position);
          linePath.push(position);
        });

        if (showRoute && linePath.length > 1) {
          new window.kakao.maps.Polyline({
            map,
            path: linePath,
            strokeWeight: 3,
            strokeColor: "#3EA76C",
            strokeOpacity: 0.9,
            strokeStyle: "solid",
          });
        }

        map.setBounds(bounds);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [points, showRoute, onMarkerPress]);

  if (points.length === 0) return null;

  if (!KAKAO_JS_KEY || loadFailed) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-footnote text-ink-faint">지도를 표시할 수 없어요</Text>
      </View>
    );
  }

  return <View ref={containerRef} className="flex-1" style={{ minHeight: 300 }} />;
}

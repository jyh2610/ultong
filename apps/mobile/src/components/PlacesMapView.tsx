import { View } from "react-native";
import { WebView } from "react-native-webview";
import type { WebViewMessageEvent } from "react-native-webview";

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

function toScriptSafeJson(value: unknown): string {
  const lineSeparator = String.fromCharCode(0x2028);
  const paragraphSeparator = String.fromCharCode(0x2029);
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .split(lineSeparator)
    .join("\\u2028")
    .split(paragraphSeparator)
    .join("\\u2029");
}

function buildMapHtml(points: MapPoint[], showRoute: boolean): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; }</style>
</head>
<body>
  <div id="map"></div>
  <script
    src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&autoload=false"
    onerror="if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage('DEBUG:sdk script tag onerror (network/404)')"
  ></script>
  <script>
    function reportDebug(msg) {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage("DEBUG:" + msg);
    }
    window.onerror = function (msg) {
      reportDebug("onerror: " + msg);
    };
    reportDebug("script tag ran, typeof kakao=" + typeof kakao);

    var points = ${toScriptSafeJson(points)};

    try {
      kakao.maps.load(function () {
        reportDebug("kakao.maps.load fired");
        var map = new kakao.maps.Map(document.getElementById("map"), {
          center: new kakao.maps.LatLng(points[0].lat, points[0].lon),
          level: 7,
        });

        var bounds = new kakao.maps.LatLngBounds();
        var linePath = [];

        points.forEach(function (point) {
          var position = new kakao.maps.LatLng(point.lat, point.lon);
          var marker = new kakao.maps.Marker({ map: map, position: position });
          kakao.maps.event.addListener(marker, "click", function () {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(point.contentId);
            }
          });
          bounds.extend(position);
          linePath.push(position);
        });

        ${
          showRoute
            ? `if (linePath.length > 1) {
          new kakao.maps.Polyline({
            map: map,
            path: linePath,
            strokeWeight: 3,
            strokeColor: "#3EA76C",
            strokeOpacity: 0.9,
            strokeStyle: "solid",
          });
        }`
            : ""
        }

        map.setBounds(bounds);
        reportDebug("map render done");
      });
    } catch (e) {
      reportDebug("catch: " + e.message);
    }
  </script>
</body>
</html>`;
}

export function PlacesMapView({ points, showRoute = false, onMarkerPress }: PlacesMapViewProps) {
  if (points.length === 0) return null;

  const handleMessage = (event: WebViewMessageEvent) => {
    const data = event.nativeEvent.data;
    if (data.startsWith("DEBUG:")) {
      console.log("[PlacesMapView]", data.slice("DEBUG:".length));
      return;
    }
    onMarkerPress?.(data);
  };

  return (
    <View className="flex-1">
      {KAKAO_JS_KEY ? (
        <WebView
          source={{ html: buildMapHtml(points, showRoute), baseUrl: "http://localhost" }}
          originWhitelist={["*"]}
          javaScriptEnabled
          onMessage={handleMessage}
          onError={(e) => console.log("[PlacesMapView] onError", e.nativeEvent)}
          onHttpError={(e) => console.log("[PlacesMapView] onHttpError", e.nativeEvent)}
        />
      ) : (
        <View className="flex-1 items-center justify-center">
          <Text className="text-footnote text-ink-faint">지도를 표시할 수 없어요</Text>
        </View>
      )}
    </View>
  );
}

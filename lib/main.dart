import 'package:flutter/material.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:permission_handler/permission_handler.dart';

// Create a localhost server to serve the React assets correctly, pointing directly to the webview directory.
final InAppLocalhostServer localhostServer = InAppLocalhostServer(port: 8080, documentRoot: 'assets/webview');

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Request microphone permissions for Gemini TTS & Audio Context
  await Permission.microphone.request();

  // Start the localhost server
  try {
    if (!localhostServer.isRunning()) {
      await localhostServer.start();
    }
  } catch (e) {
    print("FAILED TO START LOCALHOST SERVER: $e");
  }
  
  runApp(const VocalizeApp());
}

class VocalizeApp extends StatelessWidget {
  const VocalizeApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Vocalize AI',
      theme: ThemeData.dark(),
      debugShowCheckedModeBanner: false,
      home: const WebViewScreen(),
    );
  }
}

class WebViewScreen extends StatefulWidget {
  const WebViewScreen({super.key});

  @override
  State<WebViewScreen> createState() => _WebViewScreenState();
}

class _WebViewScreenState extends State<WebViewScreen> {
  InAppWebViewController? webViewController;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF020617), // Using your Tailwind slate-950 color
      body: SafeArea(
        child: InAppWebView(
          initialUrlRequest: URLRequest(
            url: WebUri("http://localhost:8080/index.html"),
          ),
          initialSettings: InAppWebViewSettings(
            mediaPlaybackRequiresUserGesture: false,
            allowsInlineMediaPlayback: true,
            // Enable JavaScript and all web storage features
            javaScriptEnabled: true,
            domStorageEnabled: true,
            databaseEnabled: true,
            // Fix "disallowed_useragent" for Google Sign in by masquerading as a standard Chrome mobile browser
            userAgent: "Mozilla/5.0 (Linux; Android 13; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36",
            // Allow Firebase signInWithPopup to open sub-windows correctly
            javaScriptCanOpenWindowsAutomatically: true,
            supportMultipleWindows: true,
          ),
          onWebViewCreated: (controller) {
            webViewController = controller;
          },
          onCreateWindow: (controller, createWindowAction) async {
            // Wait for popup request from Firebase auth and open it in a dialog
            showDialog(
              context: context,
              barrierDismissible: false,
              builder: (context) {
                return AlertDialog(
                  contentPadding: EdgeInsets.zero,
                  insetPadding: const EdgeInsets.all(16),
                  content: SizedBox(
                    width: MediaQuery.of(context).size.width,
                    height: MediaQuery.of(context).size.height * 0.8,
                    child: InAppWebView(
                      // Pass the windowId from the popup request
                      windowId: createWindowAction.windowId,
                      initialSettings: InAppWebViewSettings(
                        javaScriptEnabled: true,
                        userAgent: "Mozilla/5.0 (Linux; Android 13; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36",
                      ),
                      // Close the dialog automatically when Firebase Auth finishes
                      onCloseWindow: (controller) {
                        Navigator.of(context).pop();
                      },
                    ),
                  ),
                );
              },
            );
            return true;
          },
          onPermissionRequest: (controller, request) async {
            return PermissionResponse(
                resources: request.resources,
                action: PermissionResponseAction.GRANT);
          },
          onConsoleMessage: (controller, consoleMessage) {
            print(consoleMessage);
          },
        ),
      ),
    );
  }
}
